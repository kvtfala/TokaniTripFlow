import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { TravelRequest, HistoryEntry, TravelQuote } from "@shared/types";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupDemoAuth } from "./demoAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth Integration - Setup authentication middleware
  await setupAuth(app);
  
  // Demo Login Integration - Setup demo login path (DEMO ONLY)
  setupDemoAuth(app);

  // Replit Auth Integration - User endpoint  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Travel Requests
  app.get("/api/requests", async (req, res) => {
    try {
      const requests = await storage.getTravelRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    try {
      const request = await storage.getTravelRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch request" });
    }
  });

  app.post("/api/requests", async (req, res) => {
    try {
      const request = await storage.createTravelRequest(req.body);
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  app.post("/api/requests/:id/approve", async (req, res) => {
    try {
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

    } catch (error) {
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  app.post("/api/requests/:id/reject", async (req, res) => {
    try {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to reject request" });
    }
  });

  // RFQ and Quotes Endpoints
  
  // Get all quotes for a request
  app.get("/api/requests/:id/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotes(req.params.id);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Create a new quote
  app.post("/api/requests/:id/quotes", async (req, res) => {
    try {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Update a quote
  app.put("/api/requests/:requestId/quotes/:quoteId", async (req, res) => {
    try {
      const quote = await storage.updateQuote(req.params.quoteId, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Delete a quote
  app.delete("/api/requests/:requestId/quotes/:quoteId", async (req, res) => {
    try {
      const success = await storage.deleteQuote(req.params.quoteId);
      if (!success) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Send RFQ to vendors
  app.post("/api/requests/:id/send-rfq", async (req, res) => {
    try {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to send RFQ" });
    }
  });

  // Submit request with quotes for final approval
  app.post("/api/requests/:id/submit-with-quotes", async (req, res) => {
    try {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to submit request with quotes" });
    }
  });

  // Get quote policy
  app.get("/api/quote-policy", async (req, res) => {
    try {
      const policy = await storage.getQuotePolicy();
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quote policy" });
    }
  });

  // Delegations
  app.get("/api/delegations", async (req, res) => {
    try {
      const delegations = await storage.getDelegations();
      res.json(delegations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch delegations" });
    }
  });

  app.post("/api/delegations", async (req, res) => {
    try {
      const delegation = await storage.createDelegation(req.body);
      res.json(delegation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create delegation" });
    }
  });

  app.patch("/api/delegations/:id", async (req, res) => {
    try {
      const delegation = await storage.updateDelegation(req.params.id, req.body);
      if (!delegation) {
        return res.status(404).json({ error: "Delegation not found" });
      }
      res.json(delegation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update delegation" });
    }
  });

  app.delete("/api/delegations/:id", async (req, res) => {
    try {
      const success = await storage.deleteDelegation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Delegation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete delegation" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
