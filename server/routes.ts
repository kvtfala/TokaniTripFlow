import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { TravelRequest, HistoryEntry, TravelQuote } from "@shared/types";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupDemoAuth } from "./demoAuth";
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
    action: params.action as any,
    entityType: params.entityType,
    entityId: params.entityId,
    previousValue: params.previousValue ?? null,
    newValue: params.newValue ?? null,
    changes,
    metadata: params.metadata ?? null,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth Integration - Setup authentication middleware
  await setupAuth(app);
  
  // Demo Login Integration - Setup demo login path (DEMO ONLY)
  setupDemoAuth(app);

  // Replit Auth Integration - User endpoint  
  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  }));

  // Travel Requests
  app.get("/api/requests", asyncHandler(async (req, res) => {
    const requests = await storage.getTravelRequests();
    res.json(requests);
  }));

  app.get("/api/requests/:id", asyncHandler(async (req, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(request);
  }));

  app.post("/api/requests", asyncHandler(async (req, res) => {
    const request = await storage.createTravelRequest(req.body);
    res.json(request);
  }));

  app.post("/api/requests/:id/approve", asyncHandler(async (req, res) => {
    const { comment, auditFlag, auditNote, approvalType } = req.body;
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // IMPORTANT: In production, replace with actual authenticated user validation
    // For now, using mock "manager" user for demonstration
    // TODO: Replace with: const currentApproverId = req.user?.id;
    // TODO: Add proper authentication middleware
    const currentApproverId = "manager";

    // Handle different approval types based on current status
    
    // PRE-APPROVAL: submitted/in_review → awaiting_quotes
    if (approvalType === "pre_approval" && (request.status === "submitted" || request.status === "in_review")) {
      const expectedApproverId = request.approverFlow[request.approverIndex];
      
      // Validate current user is authorized to approve
      if (currentApproverId !== expectedApproverId) {
        return res.status(403).json({ 
          error: "Not authorized to pre-approve this request" 
        });
      }

      // Pre-approve to collect quotes
      const historyEntry: HistoryEntry = {
        ts: new Date().toISOString(),
        actor: currentApproverId,
        action: "APPROVE",
        note: comment || "Pre-approved to collect vendor quotes",
      };

      const updates: Partial<TravelRequest> = {
        status: "awaiting_quotes",
        approverIndex: request.approverIndex + 1,
        history: [...request.history, historyEntry],
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
      // CRITICAL: Validate current user is authorized to approve at this stage
      const expectedApproverId = request.approverFlow[request.approverIndex];
      
      if (currentApproverId !== expectedApproverId) {
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

      // Advance to next approver or mark as approved
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
      
      // Validate current user is authorized to approve at this stage
      if (currentApproverId !== expectedApproverId) {
        return res.status(403).json({ 
          error: "Not authorized to approve this request at this stage" 
        });
      }

      // Add approval to history
      const historyEntry: HistoryEntry = {
        ts: new Date().toISOString(),
        actor: currentApproverId,
        action: "APPROVE",
        note: comment || "Approved",
      };

      // Advance to next approver or mark as approved
      const newIndex = request.approverIndex + 1;
      const isFinalApproval = newIndex >= request.approverFlow.length;

      const updates: Partial<TravelRequest> = {
        approverIndex: newIndex,
        status: isFinalApproval ? "approved" : "in_review",
        history: [...request.history, historyEntry],
      };

      // Only set audit flags if provided (don't overwrite existing)
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

  app.post("/api/requests/:id/reject", asyncHandler(async (req, res) => {
    const { comment } = req.body;
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Validate request status - can only reject submitted or in_review requests
    if (request.status !== "submitted" && request.status !== "in_review") {
      return res.status(400).json({ 
        error: `Cannot reject request with status: ${request.status}` 
      });
    }

    // Require rejection comment
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Rejection comment is required" });
    }

    // IMPORTANT: In production, replace with actual authenticated user validation
    // For now, using mock "manager" user for demonstration  
    // TODO: Replace with: const currentApproverId = req.user?.id;
    // TODO: Add proper authentication middleware
    const currentApproverId = "manager";
    const expectedApproverId = request.approverFlow[request.approverIndex];
    
    // Validate current user is authorized to reject at this stage
    if (currentApproverId !== expectedApproverId) {
      return res.status(403).json({ 
        error: "Not authorized to reject this request at this stage" 
      });
    }

    // Add rejection to history
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

  // RFQ and Quotes Endpoints
  
  // Get all quotes for a request
  app.get("/api/requests/:id/quotes", asyncHandler(async (req, res) => {
    const quotes = await storage.getQuotes(req.params.id);
    res.json(quotes);
  }));

  // Create a new quote
  app.post("/api/requests/:id/quotes", asyncHandler(async (req, res) => {
    const request = await storage.getTravelRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Validate request is in awaiting_quotes status
    if (request.status !== "awaiting_quotes") {
      return res.status(400).json({ 
        error: `Cannot add quotes to request with status: ${request.status}` 
      });
    }

    // TODO: Get current user from session
    const currentUserId = "coordinator"; // Mock for now

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
  app.put("/api/requests/:requestId/quotes/:quoteId", asyncHandler(async (req, res) => {
    const quote = await storage.updateQuote(req.params.quoteId, req.body);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }
    res.json(quote);
  }));

  // Delete a quote
  app.delete("/api/requests/:requestId/quotes/:quoteId", asyncHandler(async (req, res) => {
    const success = await storage.deleteQuote(req.params.quoteId);
    if (!success) {
      return res.status(404).json({ error: "Quote not found" });
    }
    res.json({ success: true });
  }));

  // Send RFQ to vendors
  app.post("/api/requests/:id/send-rfq", asyncHandler(async (req, res) => {
    const { vendors } = req.body; // Array of {vendorName, email}
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "awaiting_quotes") {
      return res.status(400).json({ 
        error: `Cannot send RFQ for request with status: ${request.status}` 
      });
    }

    // TODO: Get current user from session
    const currentUserId = "coordinator"; // Mock for now

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
  app.post("/api/requests/:id/submit-with-quotes", asyncHandler(async (req, res) => {
    const { selectedQuoteId, quoteJustification } = req.body;
    const request = await storage.getTravelRequest(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
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
    const currentUserId = "coordinator"; // Mock for now

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
  app.get("/api/delegations", asyncHandler(async (req, res) => {
    const delegations = await storage.getDelegations();
    res.json(delegations);
  }));

  app.post("/api/delegations", asyncHandler(async (req, res) => {
    const delegation = await storage.createDelegation(req.body);
    res.json(delegation);
  }));

  app.patch("/api/delegations/:id", asyncHandler(async (req, res) => {
    const delegation = await storage.updateDelegation(req.params.id, req.body);
    if (!delegation) {
      return res.status(404).json({ error: "Delegation not found" });
    }
    res.json(delegation);
  }));

  app.delete("/api/delegations/:id", asyncHandler(async (req, res) => {
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
  app.get("/api/admin/users", requireRole(["super_admin", "finance_admin", "travel_admin"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    const updated = await storage.updateUser(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "update",
      entityType: "user",
      entityId: req.params.id,
      changes: req.body,
    });
    
    res.json(updated);
  }));

  // Admin Portal - Vendors
  app.get("/api/admin/vendors", requireRole(["coordinator", "manager", "finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const vendors = await storage.getVendors(status);
    res.json(vendors);
  }));

  app.get("/api/admin/vendors/:id", requireRole(["coordinator", "manager", "finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const vendor = await storage.getVendor(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
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
      proposedBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "create",
      entityType: "vendor",
      entityId: vendor.id,
      newValue: vendor,
      metadata: { vendorName: vendor.name },
    });
    
    res.json(vendor);
  }));

  app.patch("/api/admin/vendors/:id", requireRole(["finance_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertVendorSchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousVendor = await storage.getVendor(req.params.id);
    if (!previousVendor) {
      return res.status(404).json({ error: "Vendor not found" });
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
    const success = await storage.deleteVendor(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "delete",
      entityType: "vendor",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Email Templates
  app.get("/api/admin/templates", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const category = req.query.category as string | undefined;
    const templates = await storage.getEmailTemplates(category);
    res.json(templates);
  }));

  app.get("/api/admin/templates/:id", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
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
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "create",
      entityType: "email_template",
      entityId: template.id,
      newValue: template,
      metadata: { templateName: template.name },
    });
    
    res.json(template);
  }));

  app.patch("/api/admin/templates/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertEmailTemplateSchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousTemplate = await storage.getEmailTemplate(req.params.id);
    if (!previousTemplate) {
      return res.status(404).json({ error: "Template not found" });
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
    const success = await storage.deleteEmailTemplate(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "delete",
      entityType: "email_template",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Per Diem Rates
  app.get("/api/admin/rates", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const rates = await storage.getPerDiemRates();
    res.json(rates);
  }));

  app.get("/api/admin/rates/:id", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const rate = await storage.getPerDiemRate(req.params.id);
    if (!rate) {
      return res.status(404).json({ error: "Rate not found" });
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
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "create",
      entityType: "per_diem_rate",
      entityId: rate.id,
      newValue: rate,
      metadata: { location: rate.location, dailyRate: rate.dailyRate },
    });
    
    res.json(rate);
  }));

  app.patch("/api/admin/rates/:id", requireRole(["finance_admin", "super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertPerDiemRateSchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousRate = await storage.getPerDiemRate(req.params.id);
    if (!previousRate) {
      return res.status(404).json({ error: "Rate not found" });
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
    const success = await storage.deletePerDiemRate(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Rate not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "delete",
      entityType: "per_diem_rate",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Travel Policies
  app.get("/api/admin/policies", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const policies = await storage.getTravelPolicies();
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
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "create",
      entityType: "travel_policy",
      entityId: policy.id,
      newValue: policy,
      metadata: { policyName: policy.name },
    });
    
    res.json(policy);
  }));

  app.patch("/api/admin/policies/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertTravelPolicySchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousPolicy = await storage.getTravelPolicy(req.params.id);
    if (!previousPolicy) {
      return res.status(404).json({ error: "Policy not found" });
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
    const success = await storage.deleteTravelPolicy(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Policy not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "delete",
      entityType: "travel_policy",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Workflow Rules
  app.get("/api/admin/workflows", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const workflows = await storage.getWorkflowRules();
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
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "create",
      entityType: "workflow_rule",
      entityId: workflow.id,
      newValue: workflow,
      metadata: { workflowName: workflow.name },
    });
    
    res.json(workflow);
  }));

  app.patch("/api/admin/workflows/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertWorkflowRuleSchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousWorkflow = await storage.getWorkflowRule(req.params.id);
    if (!previousWorkflow) {
      return res.status(404).json({ error: "Workflow not found" });
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
    const success = await storage.deleteWorkflowRule(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "delete",
      entityType: "workflow_rule",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - System Notifications
  app.get("/api/admin/notifications", requireRole(["finance_admin", "travel_admin", "super_admin"]), asyncHandler(async (req, res) => {
    const published = req.query.published === "true" ? true : req.query.published === "false" ? false : undefined;
    const notifications = await storage.getSystemNotifications(published);
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
      createdBy: req.currentUser.id,
    });
    
    // Enhanced audit log with before/after snapshots
    await logAudit({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "create",
      entityType: "system_notification",
      entityId: notification.id,
      newValue: notification,
      metadata: { title: notification.title },
    });
    
    res.json(notification);
  }));

  app.patch("/api/admin/notifications/:id", requireRole(["super_admin"]), asyncHandler(async (req: any, res) => {
    // Validate request body
    const validation = validateRequest(insertSystemNotificationSchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // Get previous state for audit and clone to prevent mutation
    const previousNotification = await storage.getSystemNotification(req.params.id);
    if (!previousNotification) {
      return res.status(404).json({ error: "Notification not found" });
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
    const success = await storage.deleteSystemNotification(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Audit log
    await storage.createAuditLog({
      userId: req.currentUser.id,
      userName: `${req.currentUser.firstName} ${req.currentUser.lastName}`,
      action: "delete",
      entityType: "system_notification",
      entityId: req.params.id,
    });
    
    res.json({ success: true });
  }));

  // Admin Portal - Audit Logs
  app.get("/api/admin/audit-logs", requireRole(["super_admin"]), asyncHandler(async (req, res) => {
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const logs = await storage.getAuditLogs(entityType, entityId);
    res.json(logs);
  }));

  const httpServer = createServer(app);

  return httpServer;
}
