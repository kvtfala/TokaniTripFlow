Warning: truncated output (original token count: 23282)
Total output lines: 2187

import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import type { TravelRequest, HistoryEntry, TravelQuote, ExpenseClaim } from "@shared/types";
import { extractReceiptData } from "./services/receiptOcr";
import { setupAuth, setupPassportSession, isAuthenticated, isLoggedIn } from "./replitAuth";
import { createSupabaseIdentityMiddleware, readSupabaseAuthConfig, registerSupabaseAuthRoutes } from "./auth/supabaseAuth";
import { isDemoAuthEnabled, retireLegacyApiWhenSupabaseEnabled } from "./security/httpSecurity";
import { createSupabaseTravelCaseStore } from "./phase1/supabaseTravelCaseStore";
import { registerTravelCaseRoutes } from "./phase1/travelCaseRoutes";
import { setupDemoAuth } from "./demoAuth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getApprovalTokenSecret } from "./config/securityEnvironment";

const APPROVAL_TOKEN_SECRET = getApprovalTokenSecret();

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
function validateRequest<S extends z.AnyZodObject>(schema: S, data: unknown): { success: true; data: z.infer<S> } | { success: false; error: string } {
  // Always apply strict() to reject unknown fields and prevent schema bypass
  const strictSchema = schema.strict();
  const result = strictSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
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
  changes?: unknown;
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
  const supabaseAuth = readSupabaseAuthConfig();
  const demoAuth = isDemoAuthEnabled();
  if (demoAuth) setupPassportSession(app);
  if (supabaseAuth) {
    registerSupabaseAuthRoutes(app, supabaseAuth);
    app.use(createSupabaseIdentityMiddleware(supabaseAuth));
    app.use(retireLegacyApiWhenSupabaseEnabled(true));
    if (process.env.SUPABASE_SECRET_KEY) {
      registerTravelCaseRoutes(app, createSupabaseTravelCaseStore({
        url: supabaseAuth.url,
        secretKey: process.env.SUPABASE_SECRET_KEY,
      }));
    }
  }
  if (demoAuth) setupDemoAuth(app);

  // Object Storage — presigned URL upload + file serving
  registerObjectStorageRoutes(app);

  // Sitemap — public pages only (no auth required)
  app.get("/sitemap.xml", (_req, res) => {
    const BASE_URL = "https://tripflow.tokani.com.fj";
    const now = new Date().toISOString().split("T")[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  // Auth User Endpoint - Works with both Replit Auth and Demo sessions
  app.get('/api/auth/user', asyncHandler(async (req: any, res) => {
    if (supabaseAuth) {
      return res.redirect(307, "/api/v1/auth/session");
    }
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
      department: u.companyCode === "thc001" ? "Tuvalu High Commission" : u.companyCode === "khc001" ? "Kiribati High Commission" : "Island Travel Tech",
      manager: roleToMgr[u.role ?? "employee"] ?? "Manager",
    }));

    res.json(travellers);
  }));

  // Logout Endpoint - Destroys session and redirects to landing page
  if (demoAuth) app.get("/api/logout", (req, res) => {
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
    // Each user only sees requests belonging to their own organisation.
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

  // ── PATCH /api/requests/:id/ttc — update TTC case-management fields ────────
  // Restricted to coordinator / travel_admin / super_admin.
  // Appends a TTC_UPDATED history entry so changes are traceable.
  const ttcUpdateSchema = z.object({
    ttcCaseType: z.enum(["complex_travel","medical_travel","medical_escort","official_travel","delegation_travel","urgent_travel","visa_dependent_travel","other"]).nullable().optional(),
    ttcPriority: z.enum(["normal","high","urgent"]).optional(),
    ttcServiceLevel: z.enum(["remote","full_service","onsite"]).optional(),
    currentDependency: z.enum(["tokani","client","agent","approver","traveller","visa_documents","finance","none"]).optional(),
    nextAction: z.string().max(2000).nullable().optional(),
    followUpDueDate: z.string().nullable().optional(),
    issueFlag: z.boolean().optional(),
    caseOwner: z.string().max(100).nullable().optional(),
  });

  const TTC_ALLOWED_ROLES = new Set(["coordinator", "travel_admin", "super_admin"]);

  app.patch("/api/requests/:id/ttc", isLoggedIn, asyncHandler(async (req: any, res) => {
    const actor = await resolveActingUser(req);
    if (!actor || !TTC_ALLOWED_ROLES.has(actor.role)) {
      return res.status(403).json({ error: "Only coordinators and travel admins may edit TTC fields." });
    }

    const request = await storage.getTravelRequest(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (!await assertTenantAccess(req, request)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const parsed = ttcUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid TTC fields", details: parsed.error.flatten() });
    }

    const updates: Partial<import("@shared/types").TravelRequest> = {
      ...parsed.data,
      ttcCaseType: parsed.data.ttcCaseType ?? undefined,
      nextAction: parsed.data.nextAction ?? undefined,
      followUpDueDate: parsed.data.followUpDueDate ?? undefined,
      caseOwner: parsed.data.caseOwner ?? undefined,
    };

    // Append a history entry so the change is traceable
    const historyEntry: import("@shared/types").HistoryEntry = {
      ts: new Date().toISOString(),
      actor: actor.displayName,
      action: "COMMENT",
      note: `TTC fields updated by ${actor.displayName}`,
    };
    updates.history = [...(request.history ?? []), historyEntry];

    const updated = await storage.updateTravelRequest(req.params.id, updates);
    res.json(updated);
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
    const request …11282 tokens truncated…ror: "Action must be 'approve' or 'reject'" });
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
