import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { createHmac, timingSafeEqual } from "crypto";
import { storage } from "./storage";
import type { TravelRequest, HistoryEntry, TravelQuote, ExpenseClaim } from "@shared/types";
import { extractReceiptData } from "./services/receiptOcr";
import { setupAuth, setupPassportSession, isAuthenticated, isLoggedIn } from "./replitAuth";
import { setupDemoAuth } from "./demoAuth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// HMAC token secret — in production, load from env
const APPROVAL_TOKEN_SECRET = process.env.APPROVAL_TOKEN_SECRET || "tokani-tripflow-secret-2025";

function generateApprovalToken(requestId: string, approverId: string): string {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${requestId}:${approverId}:${expiry}`;
  const sig = createHmac("sha256", APPROVAL_TOKEN_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyApprovalToken(token: string): { requestId: string; approverId: string; expiry: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [requestId, approverId, expiryStr, sig] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) return null;
    const payload = `${requestId}:${approverId}:${expiryStr}`;
    const expectedSig = createHmac("sha256", APPROVAL_TOKEN_SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
    return { requestId, approverId, expiry };
  } catch {
    return null;
  }
}
import { 
  insertVendorSchema, 
  insertEmailTemplateSchema, 
  insertPerDiemRateSchema,
  insertTravelPolicySchema,
  insertWorkflowRuleSchema,
  insertSystemNotificationSchema,
  insertAuditLogSchema
} from "@shared/schema";

// AsyncHandler: Wraps async route handlers to properly catch errors and pass to next()
// This satisfies ESLint no-misused-promises by ensuring promises are handled
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper function to validate request body with Zod schema using safeParse
function validateRequest<T>(schema: any, data: any): { success: true; data: T } | { success: false; error: string } {
  // Always apply strict() to reject unknown fields and prevent schema bypass
  const strictSchema = schema.strict();
  const result = strictSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data as T };
  } else {
    const message = result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: message };
  }
}

// Helper function to create audit log with before/after snapshots
async function logAudit(params: {
  userId: string;
  userName: string;
  companyCode?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  metadata?: any;
}) {
  // Compute field-level changes, handling null/undefined and nested objects safely
  let changes: any = null;
  
  // Only compute changes if both values are defined (not null/undefined)
  if (params.previousValue != null && params.newValue != null) {
    changes = {};
    const allKeys = new Set([
      ...Object.keys(params.previousValue),
      ...Object.keys(params.newValue)
    ]);
    
    for (const key of allKeys) {
      const oldVal = params.previousValue[key];
      const newVal = params.newValue[key];
      
      // Deep comparison for objects/arrays, shallow for primitives
      const isDifferent = typeof oldVal === 'object' || typeof newVal === 'object'
        ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
        : oldVal !== newVal;
      
      if (isDifferent) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }
    
    // If no changes detected, set to null
    if (Object.keys(changes).length === 0) {
      changes = null;
    }
  }

  await storage.createAuditLog({
    userId: params.userId,
    userName: params.userName,
    companyCode: params.companyCode ?? null,
    action: params.action as any,
    entityType: params.entityType,
    entityId: params.entityId,
    previousValue: params.previousValue ?? null,
    newValue: params.newValue ?? null,
    changes,
    metadata: params.metadata ?? null,
  });
}

/**
 * Synchronous tenant guard for admin entity operations.
 * Returns true if the current user may read/modify the given record.
 * - Users with no companyCode (platform-level super_admin via Replit Auth) bypass the check — full access.
 * - All other users must match the record's companyCode exactly — 403 on mismatch (including null).
 * NOTE: All seeded and API-created records always carry a companyCode, so null-record matches
 * should never occur in normal operation.
 */
function assertAdminTenantRecord(req: any, record: { companyCode?: string | null }): boolean {
  const userCode: string | null | undefined = req.currentUser?.companyCode;
  if (!userCode) return true; // platform super_admin (no companyCode) — full access
  return record.companyCode === userCode; // strict exact match; no legacy exception
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth Integration - DISABLED (Demo-only mode)
  // Setup Passport session management for demo login (without Replit OIDC routes)
  setupPassportSession(app);
  
  // Demo Login Integration - Setup demo login path (DEMO ONLY)
  setupDemoAuth(app);

  // Object Storage — presigned URL upload + file serving
  registerObjectStorageRoutes(app);

  // Auth User Endpoint - Works with both Replit Auth and Demo sessions
  app.get('/api/auth/user', asyncHandler(async (req: any, res) => {
    // Check if user is authenticated (either via Replit Auth or Demo login)
    if (!req.user || !req.user.claims) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  }));

  // Tenant-scoped user directory — for traveller selection in the wizard
  // Returns all users that belong to the same companyCode as the requester.
  // Maps User records to the Traveller shape consumed by the frontend wizard.
  app.get("/api/users", isLoggedIn, asyncHandler(async (req: any, res) => {
    let userId: string | null = null;
    if (req.user?.claims?.sub) userId = req.user.claims.sub;
    else if (req.session?.user?.id) userId = req.session.user.id;

    const currentUser = userId ? await storage.getUser(userId) : null;
    const companyCode = currentUser?.companyCode ?? null;

    const allUsers = await storage.getAllUsers();
    const tenantUsers = companyCode
      ? allUsers.filter(u => u.companyCode === companyCode)
      : allUsers;

    const roleToPosition: Record<string, string> = {
      super_admin: "Managing Director",
      manager: "Department Manager",
      finance_admin: "Finance Administrator",
      travel_admin: "Travel Administrator",
      coordinator: "Travel Coordinator",
      employee: "Staff",
    };
    const roleToMgr: Record<string, string> = {
      super_admin: "Board",
      manager: "Managing Director",
      finance_admin: "Managing Director",
      travel_admin: "Managing Director",
      coordinator: "Department Manager",
      employee: "Department Manager",
    };

    const travellers = tenantUsers.map((u, idx) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" "),
      employeeNumber: `EMP${String(idx + 1).padStart(3, "0")}`,
      position: roleToPosition[u.role ?? "employee"] ?? "Staff",
      department: u.companyCode === "cdp001" ? "CDP Couriers" : "Island Travel Tech",
      manager: roleToMgr[u.role ?? "employee"] ?? "Manager",
    }));

    res.json(travellers);
  }));

  // Logout Endpoint - Destroys session and redirects to landing page
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to log out" });
      }
      
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
        }
        res.redirect("/");
      });
    });
  });

  // Travel Requests
  app.get("/api/requests", isLoggedIn, asyncHandler(async (req, res) => {
    let requests = await storage.getTravelRequests();

    // Scope requests to the logged-in user's tenant (companyCode).
    // Users with companyCode "cdp001" only see CDP requests.
    // Users with companyCode "itt001" (or no code) see ITT / legacy requests only.
    let sessionUserId: string | null = null;
    if ((req as any).user?.claims?.sub) {
      sessionUserId = (req as any).user.claims.sub;
    } else if ((req as any).session?.user?.id) {
      sessionUserId = (req as any).session.user.id;
    }
    if (sessionUserId) {
      const sessionUser = await storage.getUser(sessionUserId);
      if (sessionUser?.companyCode) {
        const userCode = sessionUser.companyCode;
        requests = requests.filter(r =>
          r.companyCode === userCode ||
          // Backward compat: legacy ITT seed records have no companyCode
          (userCode === "itt001" && !r.companyCode)
        );
      }
    }

    const ttr = (req.query.ttr as string | undefined)?.toLowerCase();
    if (ttr) {
      requests = requests.filter(r => r.ttrNumber?.toLowerCase().includes(ttr));
    }
    res.json(requests);
  }));

  app.get("/api/requests/:id", isLoggedIn, asyncHandler(async (req, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(request);
  }));

  app.post("/api/requests", isLoggedIn, asyncHandler(async (req, res) => {
    const request = await storage.createTravelRequest(req.body);
    res.json(request);
  }));

  // Helper: resolve the currently logged-in user from session (OIDC or demo).
  // Returns { id, role, displayName } or falls back to the legacy "manager" mock
  // so unauthenticated API calls (e.g. test scripts) continue to work.
  const resolveActingUser = async (req: any): Promise<{ id: string; role: string; displayName: string } | null> => {
    try {
      let userId: string | null = null;
      if (req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      } else if (req.session?.user?.id) {
        userId = req.session.user.id;
      }
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          return {
            id: user.id,
            role: user.role || "employee",
            displayName: `${user.firstName} ${user.lastName}`.trim() || user.id,
          };
        }
      }
    } catch (_) { /* fall through */ }
    return null;
  };

  /**
   * Tenant access guard — call after fetching any TravelRequest by ID.
   * Returns true when the session user is permitted to access that request.
   * Super-admins with no companyCode (Replit Auth / legacy) bypass the check.
   * ITT users (companyCode "itt001") may access legacy records that have no companyCode.
   */
  const assertTenantAccess = async (req: any, request: { companyCode?: string }): Promise<boolean> => {
    try {
      let userId: string | null = null;
      if (req.user?.claims?.sub) userId = req.user.claims.sub;
      else if (req.session?.user?.id) userId = req.session.user.id;
      if (!userId) return true; // anonymous / non-demo — let isLoggedIn handle auth
      const user = await storage.getUser(userId);
      if (!user?.companyCode) return true; // Replit Auth users have no companyCode — full access
      const userCode = user.companyCode;
      const reqCode = request.companyCode;
      return reqCode === userCode || (userCode === "itt001" && !reqCode);
    } catch (err) {
      console.error("[assertTenantAccess] Error during tenant check:", err);
      return false; // fail closed — deny access when user lookup fails
    }
  };

  app.post("/api/requests/:id/approve", isLoggedIn, asyncHandler(async (req: any, res) => {
    const { comment, auditFlag, auditNote, approvalType } = req.body;
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const actor = await resolveActingUser(req);
    if (!actor) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const isSuperAdmin = actor.role === "super_admin";
    // Audit trail uses the actor's display name for readability
    const currentApproverId = isSuperAdmin ? `${actor.displayName} (Super Admin)` : actor.displayName;

    // Handle different approval types based on current status
    
    // PRE-APPROVAL: submitted/in_review → awaiting_quotes
    if (approvalType === "pre_approval" && (request.status === "submitted" || request.status === "in_review")) {
      const expectedApproverId = request.approverFlow[request.approverIndex];
      
      // Super admin bypasses identity check; others must match expected approver
      if (!isSuperAdmin && actor.id !== expectedApproverId) {
        return res.status(403).json({ 
          error: "Not authorized to pre-approve this request" 
        });
      }

      // Pre-approve to collect quotes — auto-send RFQ to all approved vendors (tenant-scoped)
      const now = new Date().toISOString();
      const actorFull = actor?.id ? await storage.getUser(actor.id) : null;
      const actorTenantCode = actorFull?.companyCode ?? null;
      const approvedVendors = await storage.getVendors("approved", actorTenantCode);

      const rfqRecipients = approvedVendors.map((v: any) => ({
        vendorName: v.name,
        email: v.contactEmail,
        sentAt: now,
      }));

      const rfqNote = approvedVendors.length > 0
        ? `Pre-approved. RFQ automatically sent to ${approvedVendors.length} approved vendor(s): ${approvedVendors.map((v: any) => v.name).join(", ")}`
        : "Pre-approved to collect vendor quotes (no approved vendors on file yet)";

      console.log(`[Auto-RFQ] Pre-approval for ${req.params.id}: RFQ auto-sent to ${approvedVendors.length} vendor(s)`);

      const historyEntry: HistoryEntry = {
        ts: now,
        actor: currentApproverId,
        action: "APPROVE",
        note: comment ? `${comment} — ${rfqNote}` : rfqNote,
      };

      const rfqHistoryEntry: HistoryEntry = approvedVendors.length > 0 ? {
        ts: now,
        actor: "system",
        action: "COMMENT",
        note: `Auto-RFQ: Sent to ${approvedVendors.map((v: any) => v.name).join(", ")}`,
      } : null as any;

      const updates: Partial<TravelRequest> = {
        status: "awaiting_quotes",
        approverIndex: request.approverIndex + 1,
        history: [
          ...request.history,
          historyEntry,
          ...(rfqHistoryEntry ? [rfqHistoryEntry] : []),
        ],
        rfqRecipients: [...(request.rfqRecipients || []), ...rfqRecipients],
      };

      if (auditFlag !== undefined) {
        updates.auditFlag = auditFlag;
      }
      if (auditNote) {
        updates.auditNote = auditNote;
      }

      const updated = await storage.updateTravelRequest(req.params.id, updates);
      return res.json(updated);
    }

    // FINAL APPROVAL: quotes_submitted → approved
    if (request.status === "quotes_submitted") {
      const expectedApproverId = request.approverFlow[request.approverIndex];
      
      // Super admin bypasses identity check
      if (!isSuperAdmin && actor.id !== expectedApproverId) {
        return res.status(403).json({ 
          error: "Not authorized to approve this request at this stage" 
        });
      }

      // Validate quotes exist and meet requirements
      const quotes = await storage.getQuotes(req.params.id);
      const policy = await storage.getQuotePolicy();
      const isInternational = request.destination.country !== "Fiji";
      const minQuotes = isInternational ? (policy?.minQuotesInternational || 3) : (policy?.minQuotesDomestic || 2);

      if (quotes.length < minQuotes && !request.quoteRequirementOverridden) {
        return res.status(400).json({ 
          error: `Cannot approve: Policy requires ${minQuotes} quotes, only ${quotes.length} provided` 
        });
      }

      if (!request.selectedQuoteId) {
        return res.status(400).json({ error: "Cannot approve: No quote selected" });
      }

      const historyEntry: HistoryEntry = {
        ts: new Date().toISOString(),
        actor: currentApproverId,
        action: "APPROVE",
        note: comment || "Final approval with selected quote",
      };

      const newIndex = request.approverIndex + 1;
      const isFinalApproval = newIndex >= request.approverFlow.length;

      const updates: Partial<TravelRequest> = {
        approverIndex: newIndex,
        status: isFinalApproval ? "approved" : "in_review",
        history: [...request.history, historyEntry],
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentApproverId,
      };

      if (auditFlag !== undefined) {
        updates.auditFlag = auditFlag;
      }
      if (auditNote) {
        updates.auditNote = auditNote;
      }

      const updated = await storage.updateTravelRequest(req.params.id, updates);
      return res.json(updated);
    }

    // REGULAR APPROVAL (EXISTING FLOW): submitted/in_review → in_review/approved
    if (request.status === "submitted" || request.status === "in_review") {
      const expectedApproverId = request.approverFlow[request.approverIndex];
      
      // Super admin bypasses identity check
      if (!isSuperAdmin && actor.id !== expectedApproverId) {
        return res.status(403).json({ 
          error: "Not authorized to approve this request at this stage" 
        });
      }

      const historyEntry: HistoryEntry = {
        ts: new Date().toISOString(),
        actor: currentApproverId,
        action: "APPROVE",
        note: comment || "Approved",
      };

      const newIndex = request.approverIndex + 1;
      const isFinalApproval = newIndex >= request.approverFlow.length;

      const updates: Partial<TravelRequest> = {
        approverIndex: newIndex,
        status: isFinalApproval ? "approved" : "in_review",
        history: [...request.history, historyEntry],
      };

      if (auditFlag !== undefined) {
        updates.auditFlag = auditFlag;
      }
      if (auditNote) {
        updates.auditNote = auditNote;
      }

      if (isFinalApproval) {
        updates.reviewedAt = new Date().toISOString();
        updates.reviewedBy = currentApproverId;
      }

      const updated = await storage.updateTravelRequest(req.params.id, updates);
      return res.json(updated);
    }

    // Invalid status for approval
    return res.status(400).json({ 
      error: `Cannot approve request with status: ${request.status}` 
    });
  }));

  app.post("/api/requests/:id/reject", isLoggedIn, asyncHandler(async (req: any, res) => {
    const { comment } = req.body;
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate request status — can reject at any active approval stage
    const rejectableStatuses = ["submitted", "in_review", "awaiting_quotes", "quotes_submitted"];
    if (!rejectableStatuses.includes(request.status)) {
      return res.status(400).json({ 
        error: `Cannot reject request with status: ${request.status}` 
      });
    }

    // Require rejection comment
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Rejection comment is required" });
    }

    const actor = await resolveActingUser(req);
    if (!actor) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const isSuperAdmin = actor.role === "super_admin";
    const currentApproverId = isSuperAdmin ? `${actor.displayName} (Super Admin)` : actor.displayName;
    const expectedApproverId = request.approverFlow[request.approverIndex];
    
    // Super admin bypasses identity check; others must match expected approver
    if (!isSuperAdmin && actor.id !== expectedApproverId) {
      return res.status(403).json({ 
        error: "Not authorized to reject this request at this stage" 
      });
    }

    const historyEntry: HistoryEntry = {
      ts: new Date().toISOString(),
      actor: currentApproverId,
      action: "REJECT",
      note: comment,
    };

    const updates: Partial<TravelRequest> = {
      status: "rejected",
      history: [...request.history, historyEntry],
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentApproverId,
      reviewComment: comment,
    };

    const updated = await storage.updateTravelRequest(req.params.id, updates);
    res.json(updated);
  }));

  // Cancel a request (self-service by requester — draft or submitted only)
  app.post("/api/requests/:id/cancel", isLoggedIn, asyncHandler(async (req: any, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (request.status !== "draft" && request.status !== "submitted") {
      return res.status(400).json({
        error: `Cannot cancel a request with status: ${request.status}. Only draft or submitted requests can be cancelled.`,
      });
    }

    const historyEntry: HistoryEntry = {
      ts: new Date().toISOString(),
      actor: req.currentUser?.id ?? "requester",
      action: "REJECT",
      note: "Request cancelled by requester",
    };

    const updated = await storage.updateTravelRequest(req.params.id, {
      status: "rejected",
      history: [...request.history, historyEntry],
      reviewedAt: new Date().toISOString(),
      reviewComment: "Cancelled by requester",
    });

    res.json(updated);
  }));

  // RFQ and Quotes Endpoints
  
  // Get all quotes for a request
  app.get("/api/requests/:id/quotes", isLoggedIn, asyncHandler(async (req, res) => {
    const quotes = await storage.getQuotes(req.params.id);
    res.json(quotes);
  }));

  // Create a new quote
  app.post("/api/requests/:id/quotes", isLoggedIn, asyncHandler(async (req, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate request is in awaiting_quotes status
    if (request.status !== "awaiting_quotes") {
      return res.status(400).json({ 
        error: `Cannot add quotes to request with status: ${request.status}` 
      });
    }

    // TODO: Get current user from session
    const rfqActor = await resolveActingUser(req); const currentUserId = rfqActor?.id ?? "coordinator";

    const quote = await storage.createQuote({
      requestId: req.params.id,
      ...req.body,
      createdBy: currentUserId,
    });

    // Add to history
    const historyEntry: HistoryEntry = {
      ts: new Date().toISOString(),
      actor: currentUserId,
      action: "QUOTE",
      note: `Quote added from ${req.body.vendorName} - ${req.body.currency} ${req.body.quoteValue}`,
    };

    await storage.updateTravelRequest(req.params.id, {
      history: [...request.history, historyEntry],
    });

    res.json(quote);
  }));

  // Update a quote
  app.put("/api/requests/:requestId/quotes/:quoteId", isLoggedIn, asyncHandler(async (req, res) => {
    const quote = await storage.updateQuote(req.params.quoteId, req.body);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }
    res.json(quote);
  }));

  // Delete a quote
  app.delete("/api/requests/:requestId/quotes/:quoteId", isLoggedIn, asyncHandler(async (req, res) => {
    const success = await storage.deleteQuote(req.params.quoteId);
    if (!success) {
      return res.status(404).json({ error: "Quote not found" });
    }
    res.json({ success: true });
  }));

  // Send RFQ to vendors
  app.post("/api/requests/:id/send-rfq", isLoggedIn, asyncHandler(async (req, res) => {
    const { vendors } = req.body; // Array of {vendorName, email}
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (request.status !== "awaiting_quotes") {
      return res.status(400).json({ 
        error: `Cannot send RFQ for request with status: ${request.status}` 
      });
    }

    // TODO: Get current user from session
    const rfqActor = await resolveActingUser(req); const currentUserId = rfqActor?.id ?? "coordinator";

    const now = new Date().toISOString();
    const rfqRecipients = vendors.map((v: any) => ({
      vendorName: v.vendorName,
      email: v.email,
      sentAt: now,
    }));

    // TODO: Actually send emails to vendors
    // For now, just log the RFQ sending
    console.log(`RFQ sent to ${vendors.length} vendors for request ${req.params.id}`);

    // Update request with RFQ recipients
    const historyEntry: HistoryEntry = {
      ts: now,
      actor: currentUserId,
      action: "COMMENT",
      note: `RFQ sent to ${vendors.length} vendor(s): ${vendors.map((v: any) => v.vendorName).join(", ")}`,
    };

    const updated = await storage.updateTravelRequest(req.params.id, {
      rfqRecipients: [...(request.rfqRecipients || []), ...rfqRecipients],
      history: [...request.history, historyEntry],
    });

    res.json(updated);
  }));

  // Submit request with quotes for final approval
  app.post("/api/requests/:id/submit-with-quotes", isLoggedIn, asyncHandler(async (req, res) => {
    const { selectedQuoteId, quoteJustification } = req.body;
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (request.status !== "awaiting_quotes") {
      return res.status(400).json({ 
        error: `Cannot submit quotes for request with status: ${request.status}` 
      });
    }

    // Get all quotes for this request
    const quotes = await storage.getQuotes(req.params.id);

    // Check minimum quote requirement
    const policy = await storage.getQuotePolicy();
    const isInternational = request.destination.country !== "Fiji";
    const minQuotes = isInternational ? (policy?.minQuotesInternational || 3) : (policy?.minQuotesDomestic || 2);

    if (quotes.length < minQuotes && !request.quoteRequirementOverridden) {
      return res.status(400).json({ 
        error: `Policy requires at least ${minQuotes} quotes (${isInternational ? 'international' : 'domestic'}). You have ${quotes.length}. Request override if needed.`
      });
    }

    // Validate selected quote exists
    const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
    if (!selectedQuote) {
      return res.status(400).json({ error: "Selected quote not found" });
    }

    // Check if justification is required (not the cheapest)
    const cheapestQuote = quotes.reduce((min, q) => q.quoteValue < min.quoteValue ? q : min);
    if (selectedQuoteId !== cheapestQuote.id && !quoteJustification) {
      return res.status(400).json({ 
        error: "Justification required when not selecting the cheapest quote" 
      });
    }

    // TODO: Get current user from session
    const rfqActor = await resolveActingUser(req); const currentUserId = rfqActor?.id ?? "coordinator";

    // Update request status to quotes_submitted
    const historyEntry: HistoryEntry = {
      ts: new Date().toISOString(),
      actor: currentUserId,
      action: "SUBMIT",
      note: `Submitted with ${quotes.length} quotes for final approval. Selected: ${selectedQuote.vendorName} (${selectedQuote.currency} ${selectedQuote.quoteValue})`,
    };

    const updated = await storage.updateTravelRequest(req.params.id, {
      status: "quotes_submitted",
      selectedQuoteId,
      quoteJustification: quoteJustification || undefined,
      history: [...request.history, historyEntry],
    });

    res.json(updated);
  }));

  // Get quote policy
  app.get("/api/quote-policy", asyncHandler(async (req, res) => {
    const policy = await storage.getQuotePolicy();
    res.json(policy);
  }));

  // Delegations
  app.get("/api/delegations", isLoggedIn, asyncHandler(async (req, res) => {
    const delegations = await storage.getDelegations();
    res.json(delegations);
  }));

  app.post("/api/delegations", isLoggedIn, asyncHandler(async (req, res) => {
    const delegation = await storage.createDelegation(req.body);
    res.json(delegation);
  }));

  app.patch("/api/delegations/:id", isLoggedIn, asyncHandler(async (req, res) => {
    const delegation = await storage.updateDelegation(req.params.id, req.body);
    if (!delegation) {
      return res.status(404).json({ error: "Delegation not found" });
    }
    res.json(delegation);
  }));

  app.delete("/api/delegations/:id", isLoggedIn, asyncHandler(async (req, res) => {
    const success = await storage.deleteDelegation(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Delegation not found" });
    }
    res.json({ success: true });
  }));

  // Admin Portal - Role-Based Access Control Middleware
  const requireRole = (allowedRoles: string[]) => {
    return async (req: any, res: any, next: any) => {
      try {
        // Get user from session or demo session
        let userId: string;
        let userRole: string;

        if (req.user?.claims?.sub) {
          // OIDC session
          userId = req.user.claims.sub;
        } else if (req.session?.user) {
          // Demo session
          userId = req.session.user.id;
        } else {
          return res.status(401).json({ error: "Unauthorized - Please log in" });
        }

        // Fetch user from storage
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }

        userRole = user.role || "employee";

        // Check if user has required role
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({ 
            error: "Forbidden - Insufficient permissions",
            required: allowedRoles,
            current: userRole
          });
        }

        // Attach user to request for use in route handlers
        req.currentUser = user;
        next();
      } catch (error) {
        console.error("Role check error:", error);
        res.status(500).json({ error: "Authorization check failed" });
      }
    };
  };

  // Admin Portal - User Management
  app.get("/api/admin/users", requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // Tenant-scope: only return users in the same company (platform admins see all)
      const userCode = req.currentUser?.companyCode;
      const users = userCode ? allUsers.filter(u => u.companyCode === userCode) : allUsers;
      // Sanitize: never expose password hashes or other internal fields to clients
      const sanitized = users.map(({ passwordHash: _ph, ...safe }) => safe);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!assertAdminTenantRecord(req, targetUser)) {
      return res.status(403).json({ error: "Access denied" });
    }
    // Whitelist mutable fields — prevent arbitrary overwrite of sensitive columns
    const VALID_ROLES = ["employee", "coordinator", "manager", "finance_admin", "travel_admin", "super_admin"];
    const { role, isActive } = req.body;
    const safeUpdates: Record<string, unknown> = {};
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
      }
      safeUpdates.role = role;
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }
      safeUpdates.isActive = isActive;
    }
    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided (allowed: role, isActive)" });
    }
    const updated = await storage.updateUser(req.params.id, safeUpdates);
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "user",
      entityId: req.params.id,
      changes: safeUpdates,
    });
    
    // Sanitize: strip passwordHash before returning
    const { passwordHash: _ph, ...safeUser } = updated;
    res.json(safeUser);
  }));

  // Admin Portal - Vendors
  app.get("/api/admin/vendors", requireRole(["coordinator", "manager", "finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const status = req.query.status as string | undefined;
    const cc = req.currentUser.companyCode;
    const vendors = await storage.getVendors(status, cc);
    res.json(vendors);
  }));

  app.get("/api/admin/vendors/:id", requireRole(["coordinator", "manager", "finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const vendor = await storage.getVendor(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (!assertAdminTenantRecord(req, vendor)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(vendor);
  }));

  app.post("/api/admin/vendors", requireRole(["coordinator", "manager", "finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertVendorSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const vendor = await storage.createVendor({
      ...validation.data,
      companyCode: req.currentUser.companyCode,
      proposedBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "create",
      entityType: "vendor",
      entityId: vendor.id,
      newValue: vendor,
      metadata: { vendorName: vendor.name },
    });
    
    res.json(vendor);
  }));

  app.patch("/api/admin/vendors/:id", requireRole(["finance_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body — strip server-owned fields so tenants cannot reassign companyCode
    const validation = validateRequest(insertVendorSchema.omit({ companyCode: true, proposedBy: true }).partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousVendor = await storage.getVendor(req.params.id);
    if (!previousVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (!assertAdminTenantRecord(req, previousVendor)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const previousSnapshot = structuredClone(previousVendor);

    await storage.updateVendor(req.params.id, validation.data);
    
    // Re-fetch complete entity after update to capture all server-populated fields
    const vendor = await storage.getVendor(req.params.id);
    if (!vendor) {
      return res.status(500).json({ error: "Failed to fetch updated vendor" });
    }
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "vendor",
      entityId: req.params.id,
      previousValue: previousSnapshot,
      newValue: vendor,
      metadata: { vendorName: vendor.name },
    });
    
    res.json(vendor);
  }));

  app.delete("/api/admin/vendors/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const vendorToDelete = await storage.getVendor(req.params.id);
    if (!vendorToDelete) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (!assertAdminTenantRecord(req, vendorToDelete)) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deleteVendor(req.params.id);
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "vendor",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Email Templates
  app.get("/api/admin/templates", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const category = req.query.category as string | undefined;
    const templates = await storage.getEmailTemplates(category, req.currentUser.companyCode);
    res.json(templates);
  }));

  app.get("/api/admin/templates/:id", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (!assertAdminTenantRecord(req, template)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(template);
  }));

  app.post("/api/admin/templates", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertEmailTemplateSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const template = await storage.createEmailTemplate({
      ...validation.data,
      companyCode: req.currentUser.companyCode,
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "create",
      entityType: "email_template",
      entityId: template.id,
      newValue: template,
      metadata: { templateName: template.name },
    });
    
    res.json(template);
  }));

  app.patch("/api/admin/templates/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body — strip server-owned fields so tenants cannot reassign companyCode
    const validation = validateRequest(insertEmailTemplateSchema.omit({ companyCode: true, createdBy: true }).partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousTemplate = await storage.getEmailTemplate(req.params.id);
    if (!previousTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (!assertAdminTenantRecord(req, previousTemplate)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const previousSnapshot = structuredClone(previousTemplate);

    await storage.updateEmailTemplate(req.params.id, validation.data);
    
    // Re-fetch complete entity after update to capture all server-populated fields
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) {
      return res.status(500).json({ error: "Failed to fetch updated template" });
    }
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "email_template",
      entityId: req.params.id,
      previousValue: previousSnapshot,
      newValue: template,
      metadata: { templateName: template.name },
    });
    
    res.json(template);
  }));

  app.delete("/api/admin/templates/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const templateToDelete = await storage.getEmailTemplate(req.params.id);
    if (!templateToDelete) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (!assertAdminTenantRecord(req, templateToDelete)) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deleteEmailTemplate(req.params.id);
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "email_template",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Per Diem Rates
  app.get("/api/admin/rates", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const rates = await storage.getPerDiemRates(req.currentUser.companyCode);
    res.json(rates);
  }));

  app.get("/api/admin/rates/:id", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const rate = await storage.getPerDiemRate(req.params.id);
    if (!rate) {
      return res.status(404).json({ error: "Rate not found" });
    }
    if (!assertAdminTenantRecord(req, rate)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(rate);
  }));

  app.post("/api/admin/rates", requireRole(["finance_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertPerDiemRateSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const rate = await storage.createPerDiemRate({
      ...validation.data,
      companyCode: req.currentUser.companyCode,
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "create",
      entityType: "per_diem_rate",
      entityId: rate.id,
      newValue: rate,
      metadata: { location: rate.location, dailyRate: rate.dailyRate },
    });
    
    res.json(rate);
  }));

  app.patch("/api/admin/rates/:id", requireRole(["finance_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body — strip server-owned fields so tenants cannot reassign companyCode
    const validation = validateRequest(insertPerDiemRateSchema.omit({ companyCode: true, createdBy: true }).partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousRate = await storage.getPerDiemRate(req.params.id);
    if (!previousRate) {
      return res.status(404).json({ error: "Rate not found" });
    }
    if (!assertAdminTenantRecord(req, previousRate)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const previousSnapshot = structuredClone(previousRate);

    await storage.updatePerDiemRate(req.params.id, validation.data);
    
    // Re-fetch complete entity after update to capture all server-populated fields
    const rate = await storage.getPerDiemRate(req.params.id);
    if (!rate) {
      return res.status(500).json({ error: "Failed to fetch updated rate" });
    }
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "per_diem_rate",
      entityId: req.params.id,
      previousValue: previousSnapshot,
      newValue: rate,
      metadata: { location: rate.location },
    });
    
    res.json(rate);
  }));

  app.delete("/api/admin/rates/:id", requireRole(["finance_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const rateToDelete = await storage.getPerDiemRate(req.params.id);
    if (!rateToDelete) {
      return res.status(404).json({ error: "Rate not found" });
    }
    if (!assertAdminTenantRecord(req, rateToDelete)) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deletePerDiemRate(req.params.id);
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "per_diem_rate",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Travel Policies
  app.get("/api/admin/policies", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const policies = await storage.getTravelPolicies(req.currentUser.companyCode);
    res.json(policies);
  }));

  app.post("/api/admin/policies", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertTravelPolicySchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const policy = await storage.createTravelPolicy({
      ...validation.data,
      companyCode: req.currentUser.companyCode,
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "create",
      entityType: "travel_policy",
      entityId: policy.id,
      newValue: policy,
      metadata: { policyName: policy.name },
    });
    
    res.json(policy);
  }));

  app.patch("/api/admin/policies/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body — strip server-owned fields so tenants cannot reassign companyCode
    const validation = validateRequest(insertTravelPolicySchema.omit({ companyCode: true, createdBy: true }).partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousPolicy = await storage.getTravelPolicy(req.params.id);
    if (!previousPolicy) {
      return res.status(404).json({ error: "Policy not found" });
    }
    if (!assertAdminTenantRecord(req, previousPolicy)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const previousSnapshot = structuredClone(previousPolicy);

    await storage.updateTravelPolicy(req.params.id, validation.data);
    
    // Re-fetch complete entity after update to capture all server-populated fields
    const policy = await storage.getTravelPolicy(req.params.id);
    if (!policy) {
      return res.status(500).json({ error: "Failed to fetch updated policy" });
    }
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "travel_policy",
      entityId: req.params.id,
      previousValue: previousSnapshot,
      newValue: policy,
      metadata: { policyName: policy.name },
    });
    
    res.json(policy);
  }));

  app.delete("/api/admin/policies/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const policyToDelete = await storage.getTravelPolicy(req.params.id);
    if (!policyToDelete) {
      return res.status(404).json({ error: "Policy not found" });
    }
    if (!assertAdminTenantRecord(req, policyToDelete)) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deleteTravelPolicy(req.params.id);
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "travel_policy",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Workflow Rules
  app.get("/api/admin/workflows", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const workflows = await storage.getWorkflowRules(req.currentUser.companyCode);
    res.json(workflows);
  }));

  app.post("/api/admin/workflows", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertWorkflowRuleSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const workflow = await storage.createWorkflowRule({
      ...validation.data,
      companyCode: req.currentUser.companyCode,
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "create",
      entityType: "workflow_rule",
      entityId: workflow.id,
      newValue: workflow,
      metadata: { workflowName: workflow.name },
    });
    
    res.json(workflow);
  }));

  app.patch("/api/admin/workflows/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body — strip server-owned fields so tenants cannot reassign companyCode
    const validation = validateRequest(insertWorkflowRuleSchema.omit({ companyCode: true, createdBy: true }).partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousWorkflow = await storage.getWorkflowRule(req.params.id);
    if (!previousWorkflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    if (!assertAdminTenantRecord(req, previousWorkflow)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const previousSnapshot = structuredClone(previousWorkflow);

    await storage.updateWorkflowRule(req.params.id, validation.data);
    
    // Re-fetch complete entity after update to capture all server-populated fields
    const workflow = await storage.getWorkflowRule(req.params.id);
    if (!workflow) {
      return res.status(500).json({ error: "Failed to fetch updated workflow" });
    }
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "workflow_rule",
      entityId: req.params.id,
      previousValue: previousSnapshot,
      newValue: workflow,
      metadata: { workflowName: workflow.name },
    });
    
    res.json(workflow);
  }));

  app.delete("/api/admin/workflows/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const workflowToDelete = await storage.getWorkflowRule(req.params.id);
    if (!workflowToDelete) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    if (!assertAdminTenantRecord(req, workflowToDelete)) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deleteWorkflowRule(req.params.id);
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "workflow_rule",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - System Notifications
  app.get("/api/admin/notifications", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    const published = req.query.published === "true" ? true : req.query.published === "false" ? false : undefined;
    const notifications = await storage.getSystemNotifications(published, req.currentUser.companyCode);
    res.json(notifications);
  }));

  app.post("/api/admin/notifications", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertSystemNotificationSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const notification = await storage.createSystemNotification({
      ...validation.data,
      companyCode: req.currentUser.companyCode,
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "create",
      entityType: "system_notification",
      entityId: notification.id,
      newValue: notification,
      metadata: { title: notification.title },
    });
    
    res.json(notification);
  }));

  app.patch("/api/admin/notifications/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body — strip server-owned fields so tenants cannot reassign companyCode
    const validation = validateRequest(insertSystemNotificationSchema.omit({ companyCode: true, createdBy: true }).partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousNotification = await storage.getSystemNotification(req.params.id);
    if (!previousNotification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    if (!assertAdminTenantRecord(req, previousNotification)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const previousSnapshot = structuredClone(previousNotification);

    await storage.updateSystemNotification(req.params.id, validation.data);
    
    // Re-fetch complete entity after update to capture all server-populated fields
    const notification = await storage.getSystemNotification(req.params.id);
    if (!notification) {
      return res.status(500).json({ error: "Failed to fetch updated notification" });
    }
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "system_notification",
      entityId: req.params.id,
      previousValue: previousSnapshot,
      newValue: notification,
      metadata: { title: notification.title },
    });
    
    res.json(notification);
  }));

  app.delete("/api/admin/notifications/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const notifToDelete = await storage.getSystemNotification(req.params.id);
    if (!notifToDelete) {
      return res.status(404).json({ error: "Notification not found" });
    }
    if (!assertAdminTenantRecord(req, notifToDelete)) {
      return res.status(403).json({ error: "Access denied" });
    }
    await storage.deleteSystemNotification(req.params.id);
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "system_notification",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Audit Logs
  app.get("/api/admin/audit-logs", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const logs = await storage.getAuditLogs(req.currentUser.companyCode, entityType, entityId);
    res.json(logs);
  }));

  // ──────────────────────────────────────────────────────────────────────
  // PUBLIC VENDOR LISTING (for RFQ selection – no admin role required)
  // ──────────────────────────────────────────────────────────────────────
  app.get("/api/vendors/approved", isAuthenticated, asyncHandler(async (req: any, res) => {
    const category = req.query.category as string | undefined;
    // Resolve tenant code from the acting user so we only return this tenant's vendors
    const actor = await resolveActingUser(req);
    const actorFull = actor?.id ? await storage.getUser(actor.id) : null;
    const tenantCode = actorFull?.companyCode ?? null;
    const vendors = await storage.getVendors("approved", tenantCode);
    const filtered = category ? vendors.filter(v => v.category === category) : vendors;
    res.json(filtered);
  }));

  // ──────────────────────────────────────────────────────────────────────
  // GENERATE APPROVAL TOKEN (called when moving to awaiting_quotes)
  // Returns a tokenized URL to send to manager via email
  // ──────────────────────────────────────────────────────────────────────
  app.post("/api/requests/:id/generate-approval-token", isAuthenticated, asyncHandler(async (req: any, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const approverId = request.approverFlow[request.approverIndex] || "manager";
    const token = generateApprovalToken(req.params.id, approverId);
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await storage.updateTravelRequest(req.params.id, {
      approvalToken: token,
      approvalTokenExpiry: expiry,
    });

    const approvalUrl = `${req.protocol}://${req.get("host")}/approve/${token}`;
    res.json({ token, approvalUrl, expiry });
  }));

  // ──────────────────────────────────────────────────────────────────────
  // TOKENIZED APPROVAL – GET (public, no login required)
  // Returns request details + quotes for the manager to review
  // ──────────────────────────────────────────────────────────────────────
  app.get("/api/token-approve/:token", asyncHandler(async (req, res) => {
    const parsed = verifyApprovalToken(req.params.token);
    if (!parsed) return res.status(401).json({ error: "Invalid or expired approval link" });

    const request = await storage.getTravelRequest(parsed.requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.approvalToken !== req.params.token) {
      return res.status(401).json({ error: "This approval link has been superseded" });
    }

    const quotes = await storage.getQuotes(parsed.requestId);
    const allUsers = await storage.getAllUsers();
    const approver = allUsers.find(u => u.id === parsed.approverId);

    res.json({
      request,
      quotes,
      approver: approver ? { id: approver.id, name: `${approver.firstName} ${approver.lastName}` } : null,
    });
  }));

  // ──────────────────────────────────────────────────────────────────────
  // TOKENIZED APPROVAL – POST (public, no login required)
  // Manager submits approve or reject decision via the token link
  // ──────────────────────────────────────────────────────────────────────
  app.post("/api/token-approve/:token", asyncHandler(async (req, res) => {
    const parsed = verifyApprovalToken(req.params.token);
    if (!parsed) return res.status(401).json({ error: "Invalid or expired approval link" });

    const { action, comment } = req.body as { action: "approve" | "reject"; comment?: string };
    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
    }
    if (action === "reject" && !comment?.trim()) {
      return res.status(400).json({ error: "A rejection comment is required" });
    }

    const request = await storage.getTravelRequest(parsed.requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.approvalToken !== req.params.token) {
      return res.status(401).json({ error: "This approval link has been superseded" });
    }

    if (!["submitted", "in_review", "quotes_submitted"].includes(request.status)) {
      return res.status(400).json({ error: `Request is already ${request.status} and cannot be actioned` });
    }

    const allUsers = await storage.getAllUsers();
    const approver = allUsers.find(u => u.id === parsed.approverId);
    const actorName = approver ? `${approver.firstName} ${approver.lastName}` : parsed.approverId;

    const historyEntry: HistoryEntry = {
      ts: new Date().toISOString(),
      actor: parsed.approverId,
      action: action === "approve" ? "APPROVE" : "REJECT",
      note: comment || (action === "approve" ? "Approved via secure email link" : undefined),
    };

    let newStatus: TravelRequest["status"];
    if (action === "reject") {
      newStatus = "rejected";
    } else {
      const nextIndex = request.approverIndex + 1;
      newStatus = nextIndex >= request.approverFlow.length ? "approved" : "in_review";
    }

    await storage.updateTravelRequest(parsed.requestId, {
      status: newStatus,
      approverIndex: action === "approve" ? request.approverIndex + 1 : request.approverIndex,
      reviewedAt: new Date().toISOString(),
      reviewedBy: actorName,
      reviewComment: comment,
      approvalToken: undefined,
      history: [...request.history, historyEntry],
    });

    res.json({ success: true, status: newStatus });
  }));

  // ──────────────────────────────────────────────────────────────────────
  // EXPENSE CLAIMS
  // ──────────────────────────────────────────────────────────────────────

  // List all claims (finance manager view)
  app.get("/api/expense-claims", isLoggedIn, asyncHandler(async (req, res) => {
    let claims = await storage.getExpenseClaims();
    const tcl = (req.query.tcl as string | undefined)?.toLowerCase();
    const ttr = (req.query.ttr as string | undefined)?.toLowerCase();
    if (tcl) claims = claims.filter(c => c.tclNumber?.toLowerCase().includes(tcl));
    if (ttr) claims = claims.filter(c => c.travelRequestRef?.toLowerCase().includes(ttr));
    res.json(claims);
  }));

  // List claims for a specific travel request
  app.get("/api/requests/:id/expense-claims", isLoggedIn, asyncHandler(async (req, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) return res.status(404).json({ error: "Travel request not found" });
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const claims = await storage.getExpenseClaims(req.params.id);
    res.json(claims);
  }));

  // Get single claim
  app.get("/api/expense-claims/:id", isLoggedIn, asyncHandler(async (req, res) => {
    const claim = await storage.getExpenseClaim(req.params.id);
    if (!claim) return res.status(404).json({ error: "Expense claim not found" });
    res.json(claim);
  }));

  // Create draft claim linked to a travel request
  app.post("/api/requests/:id/expense-claims", isLoggedIn, asyncHandler(async (req, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) return res.status(404).json({ error: "Travel request not found" });
    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allUsers = await storage.getAllUsers();
    const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
    const user = allUsers.find(u => u.id === userId);
    const employeeName = user ? `${user.firstName} ${user.lastName}` : "Unknown";

    const claim = await storage.createExpenseClaim({
      requestId: req.params.id,
      travelRequestRef: request.ttrNumber,
      employeeId: userId || "unknown",
      employeeName,
      lineItems: [],
      totalAmount: 0,
      currency: "FJD",
      status: "draft",
    });
    res.status(201).json(claim);
  }));

  // Update claim (add/edit line items, update fields)
  app.patch("/api/expense-claims/:id", isLoggedIn, asyncHandler(async (req, res) => {
    const existing = await storage.getExpenseClaim(req.params.id);
    if (!existing) return res.status(404).json({ error: "Expense claim not found" });
    if (!["draft", "rejected"].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot edit a claim with status '${existing.status}'` });
    }

    const updates = req.body as Partial<ExpenseClaim>;
    // Recalculate totalAmount from lineItems if provided
    if (updates.lineItems) {
      updates.totalAmount = updates.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    const updated = await storage.updateExpenseClaim(req.params.id, updates);
    res.json(updated);
  }));

  // Submit claim for review
  app.post("/api/expense-claims/:id/submit", isLoggedIn, asyncHandler(async (req, res) => {
    const existing = await storage.getExpenseClaim(req.params.id);
    if (!existing) return res.status(404).json({ error: "Expense claim not found" });
    if (existing.status !== "draft" && existing.status !== "rejected") {
      return res.status(400).json({ error: `Claim is already '${existing.status}'` });
    }
    if (existing.lineItems.length === 0) {
      return res.status(400).json({ error: "Cannot submit a claim with no line items" });
    }

    const updated = await storage.updateExpenseClaim(req.params.id, {
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
    res.json(updated);
  }));

  // Finance manager: approve claim
  app.post("/api/expense-claims/:id/approve", isLoggedIn, asyncHandler(async (req, res) => {
    const existing = await storage.getExpenseClaim(req.params.id);
    if (!existing) return res.status(404).json({ error: "Expense claim not found" });
    if (!["submitted", "under_review"].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot approve a claim with status '${existing.status}'` });
    }

    const allUsers = await storage.getAllUsers();
    const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
    const user = allUsers.find(u => u.id === userId);
    const reviewerName = user ? `${user.firstName} ${user.lastName}` : "Finance Manager";

    const { reconciliation } = req.body as { reconciliation?: ExpenseClaim["reconciliation"] };

    const updated = await storage.updateExpenseClaim(req.params.id, {
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerName,
      reconciliation,
    });
    res.json(updated);
  }));

  // Finance manager: reject claim
  app.post("/api/expense-claims/:id/reject", isLoggedIn, asyncHandler(async (req, res) => {
    const existing = await storage.getExpenseClaim(req.params.id);
    if (!existing) return res.status(404).json({ error: "Expense claim not found" });
    if (!["submitted", "under_review"].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot reject a claim with status '${existing.status}'` });
    }

    const { reason } = req.body as { reason: string };
    if (!reason?.trim()) {
      return res.status(400).json({ error: "A rejection reason is required" });
    }

    const allUsers = await storage.getAllUsers();
    const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
    const user = allUsers.find(u => u.id === userId);
    const reviewerName = user ? `${user.firstName} ${user.lastName}` : "Finance Manager";

    const updated = await storage.updateExpenseClaim(req.params.id, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerName,
      reviewNotes: reason,
    });
    res.json(updated);
  }));

  // ──────────────────────────────────────────────────────────────────────
  // RECEIPT OCR — Gemini Vision
  // Accepts base64 image data, returns extracted receipt fields
  // ──────────────────────────────────────────────────────────────────────
  app.post("/api/uploads/ocr-receipt", isLoggedIn, asyncHandler(async (req, res) => {
    const { imageBase64, mimeType } = req.body as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "imageBase64 and mimeType are required" });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ error: `Unsupported file type: ${mimeType}` });
    }

    const extractedData = await extractReceiptData(imageBase64, mimeType);
    res.json({ extractedData });
  }));

  // ──────────────────────────────────────────────────────────────────────
  // THREAT FEED — GDACS RSS Proxy (15-min cache)
  // ──────────────────────────────────────────────────────────────────────
  let threatFeedCache: { data: GdacsEvent[]; fetchedAt: Date } | null = null;

  interface GdacsEvent {
    id: string;
    title: string;
    description: string;
    alertLevel: "Green" | "Orange" | "Red";
    eventType: string;
    country: string;
    lat: number;
    lng: number;
    publishedAt: string;
  }

  app.get("/api/threat-feed", asyncHandler(async (req, res) => {
    const now = new Date();
    const CACHE_TTL_MS = 15 * 60 * 1000;

    if (threatFeedCache && (now.getTime() - threatFeedCache.fetchedAt.getTime()) < CACHE_TTL_MS) {
      return res.json({ events: threatFeedCache.data, cachedAt: threatFeedCache.fetchedAt, cached: true });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch("https://www.gdacs.org/xml/rss.xml", { signal: controller.signal });
      clearTimeout(timeout);
      const xml = await response.text();

      const { parseStringPromise } = await import("xml2js");
      const result = await parseStringPromise(xml, { explicitArray: false });
      const rawItems = result?.rss?.channel?.item || [];
      const itemArray: any[] = Array.isArray(rawItems) ? rawItems : [rawItems];

      const events: GdacsEvent[] = itemArray.slice(0, 30).map((item: any, idx: number) => ({
        id: `gdacs-${idx}-${Date.now()}`,
        title: String(item.title || ""),
        description: String(item.description || ""),
        alertLevel: (String(item["gdacs:alertlevel"] || "Green")) as "Green" | "Orange" | "Red",
        eventType: String(item["gdacs:eventtype"] || "EQ"),
        country: String(item["gdacs:country"] || ""),
        lat: parseFloat(String(item["geo:lat"] || "0")),
        lng: parseFloat(String(item["geo:long"] || "0")),
        publishedAt: String(item.pubDate || new Date().toISOString()),
      }));

      threatFeedCache = { data: events, fetchedAt: now };
      return res.json({ events, cachedAt: now, cached: false });
    } catch (err) {
      if (threatFeedCache) {
        return res.json({ events: threatFeedCache.data, cachedAt: threatFeedCache.fetchedAt, cached: true, error: "Using cached data" });
      }
      return res.status(503).json({ error: "Unable to fetch threat feed", events: [] });
    }
  }));

  // ──────────────────────────────────────────────────────────────────────
  // TRAVEL ADVISORIES — DFAT Smartraveller (curated static dataset)
  // ──────────────────────────────────────────────────────────────────────
  const TRAVEL_ADVISORIES: Record<string, { level: 1 | 2 | 3 | 4; name: string; summary: string }> = {
    "Australia":          { level: 1, name: "Australia",          summary: "Exercise normal precautions." },
    "New Zealand":        { level: 1, name: "New Zealand",        summary: "Exercise normal precautions." },
    "Fiji":               { level: 1, name: "Fiji",               summary: "Exercise normal precautions. Petty crime in urban areas. Cyclone season Nov–Apr." },
    "Samoa":              { level: 1, name: "Samoa",              summary: "Exercise normal precautions. Cyclone season Nov–Apr." },
    "Tonga":              { level: 1, name: "Tonga",              summary: "Exercise normal precautions. Volcanic and cyclone risk." },
    "Cook Islands":       { level: 1, name: "Cook Islands",       summary: "Exercise normal precautions." },
    "Niue":               { level: 1, name: "Niue",               summary: "Exercise normal precautions." },
    "Kiribati":           { level: 1, name: "Kiribati",           summary: "Exercise normal precautions." },
    "Vanuatu":            { level: 2, name: "Vanuatu",            summary: "Exercise a high degree of caution. Petty crime, volcanic activity, and cyclone risk." },
    "Solomon Islands":    { level: 2, name: "Solomon Islands",    summary: "Exercise a high degree of caution. High crime rate; avoid isolated areas after dark." },
    "Papua New Guinea":   { level: 3, name: "Papua New Guinea",   summary: "Reconsider your need to travel. High crime, civil unrest, and limited emergency services." },
    "Indonesia":          { level: 2, name: "Indonesia",          summary: "Exercise a high degree of caution. Terrorism risk, natural disasters, petty crime." },
    "Philippines":        { level: 2, name: "Philippines",        summary: "Exercise a high degree of caution. Crime, terrorism and kidnapping risk in some regions." },
    "Singapore":          { level: 1, name: "Singapore",          summary: "Exercise normal precautions." },
    "Japan":              { level: 1, name: "Japan",              summary: "Exercise normal precautions. Be aware of earthquake and tsunami risk." },
    "Thailand":           { level: 2, name: "Thailand",           summary: "Exercise a high degree of caution. Civil unrest possible. Southern border regions avoid." },
    "India":              { level: 2, name: "India",              summary: "Exercise a high degree of caution. Crime, civil unrest, terrorism risk in some areas." },
    "China":              { level: 2, name: "China",              summary: "Exercise a high degree of caution. Arbitrary detention risk for some nationalities." },
    "Hong Kong":          { level: 2, name: "Hong Kong",          summary: "Exercise a high degree of caution. Public order laws carry strict penalties." },
    "Taiwan":             { level: 2, name: "Taiwan",             summary: "Exercise a high degree of caution due to cross-strait geopolitical tensions." },
    "Malaysia":           { level: 1, name: "Malaysia",           summary: "Exercise normal precautions." },
    "South Korea":        { level: 1, name: "South Korea",        summary: "Exercise normal precautions." },
    "United States":      { level: 1, name: "United States",      summary: "Exercise normal precautions." },
    "United Kingdom":     { level: 1, name: "United Kingdom",     summary: "Exercise normal precautions." },
    "United Arab Emirates": { level: 1, name: "United Arab Emirates", summary: "Exercise normal precautions." },
    "Canada":             { level: 1, name: "Canada",             summary: "Exercise normal precautions." },
    "France":             { level: 2, name: "France",             summary: "Exercise a high degree of caution. Terrorism risk." },
    "Germany":            { level: 1, name: "Germany",            summary: "Exercise normal precautions." },
    "Myanmar":            { level: 4, name: "Myanmar",            summary: "Do not travel. Civil war, arbitrary detention, terrorism risk." },
    "Russia":             { level: 4, name: "Russia",             summary: "Do not travel. Armed conflict, arbitrary detention risk." },
    "Ukraine":            { level: 4, name: "Ukraine",            summary: "Do not travel. Ongoing armed conflict." },
    "North Korea":        { level: 4, name: "North Korea",        summary: "Do not travel. Arbitrary detention, no consular access." },
    "Afghanistan":        { level: 4, name: "Afghanistan",        summary: "Do not travel. Extreme terrorism, civil unrest, kidnapping risk." },
    "Iran":               { level: 4, name: "Iran",               summary: "Do not travel. Arbitrary detention, terrorism risk." },
    "Sudan":              { level: 4, name: "Sudan",              summary: "Do not travel. Armed conflict, civil unrest." },
  };

  app.get("/api/travel-advisories", (_req, res) => {
    res.json({
      advisories: TRAVEL_ADVISORIES,
      source: "Australian DFAT Smartraveller",
      lastReviewed: "2026-02-28",
      disclaimer: "Advisory levels curated from DFAT Smartraveller. For the most current information, visit smartraveller.gov.au",
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // ADMIN PORTAL - COMPANY SETTINGS
  // ──────────────────────────────────────────────────────────────────────
  app.get("/api/admin/settings", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const cc = req.currentUser.companyCode;
    if (!cc) return res.status(400).json({ error: "No company code associated with this account" });
    const settings = await storage.getCompanySettings(cc);
    res.json(settings ?? { companyCode: cc, displayName: "", contactEmail: "", timezone: "Pacific/Fiji", logoUrl: "" });
  }));

  app.patch("/api/admin/settings", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const cc = req.currentUser.companyCode;
    if (!cc) return res.status(400).json({ error: "No company code associated with this account" });
    // Load existing settings first so we only overwrite provided fields
    const existing = await storage.getCompanySettings(cc);
    const { displayName, contactEmail, timezone, logoUrl } = req.body;
    const updated = await storage.upsertCompanySettings({
      companyCode: cc,
      displayName: displayName !== undefined ? String(displayName) : (existing?.displayName ?? ""),
      contactEmail: contactEmail !== undefined ? (contactEmail || null) : (existing?.contactEmail ?? null),
      timezone: timezone !== undefined ? String(timezone) : (existing?.timezone ?? "Pacific/Fiji"),
      logoUrl: logoUrl !== undefined ? (logoUrl || null) : (existing?.logoUrl ?? null),
    });
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: cc,
      action: "update",
      entityType: "company_settings",
      entityId: cc,
      changes: req.body,
    });
    res.json(updated);
  }));

  // ──────────────────────────────────────────────────────────────────────
  // ADMIN PORTAL - COST CENTRES
  // ──────────────────────────────────────────────────────────────────────
  app.get("/api/admin/cost-centres", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const cc = req.currentUser.companyCode;
    if (!cc) return res.status(400).json({ error: "No company code associated with this account" });
    const centres = await storage.getCostCentreRecords(cc);
    res.json(centres);
  }));

  app.post("/api/admin/cost-centres", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const cc = req.currentUser.companyCode;
    if (!cc) return res.status(400).json({ error: "No company code associated with this account" });
    const { code, name, budgetLimit } = req.body;
    if (!code || !name) return res.status(400).json({ error: "code and name are required" });
    const record = await storage.createCostCentreRecord({
      companyCode: cc,
      code: String(code).trim(),
      name: String(name).trim(),
      budgetLimit: budgetLimit ? String(budgetLimit) : null,
    });
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: cc,
      action: "create",
      entityType: "cost_centre",
      entityId: record.id,
      newValue: record,
    });
    res.status(201).json(record);
  }));

  app.patch("/api/admin/cost-centres/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const existing = await storage.getCostCentreRecord(req.params.id);
    if (!existing) return res.status(404).json({ error: "Cost centre not found" });
    if (!assertAdminTenantRecord(req, existing)) return res.status(403).json({ error: "Access denied" });
    const { code, name, budgetLimit } = req.body;
    const updated = await storage.updateCostCentreRecord(req.params.id, {
      ...(code !== undefined && { code: String(code).trim() }),
      ...(name !== undefined && { name: String(name).trim() }),
      budgetLimit: budgetLimit !== undefined ? (budgetLimit ? String(budgetLimit) : null) : existing.budgetLimit,
    });
    if (!updated) return res.status(404).json({ error: "Cost centre not found" });
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "update",
      entityType: "cost_centre",
      entityId: req.params.id,
      previousValue: existing,
      newValue: updated,
    });
    res.json(updated);
  }));

  app.delete("/api/admin/cost-centres/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const existing = await storage.getCostCentreRecord(req.params.id);
    if (!existing) return res.status(404).json({ error: "Cost centre not found" });
    if (!assertAdminTenantRecord(req, existing)) return res.status(403).json({ error: "Access denied" });
    await storage.deleteCostCentreRecord(req.params.id);
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      companyCode: req.currentUser.companyCode,
      action: "delete",
      entityType: "cost_centre",
      entityId: req.params.id,
      previousValue: existing,
    });
    res.status(204).send();
  }));

  const httpServer = createServer(app);

  return httpServer;
}
