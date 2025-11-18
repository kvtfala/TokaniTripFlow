import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { TravelRequest, HistoryEntry } from "@shared/types";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth Integration - Setup authentication middleware
  await setupAuth(app);

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
      const { comment, auditFlag, auditNote } = req.body;
      const request = await storage.getTravelRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Validate request status - can only approve submitted or in_review requests
      if (request.status !== "submitted" && request.status !== "in_review") {
        return res.status(400).json({ 
          error: `Cannot approve request with status: ${request.status}` 
        });
      }

      // IMPORTANT: In production, replace with actual authenticated user validation
      // For now, using mock "manager" user for demonstration
      // TODO: Replace with: const currentApproverId = req.user?.id;
      // TODO: Add proper authentication middleware
      const currentApproverId = "manager";
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
      res.json(updated);
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
