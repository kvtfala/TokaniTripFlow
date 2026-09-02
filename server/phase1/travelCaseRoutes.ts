import { randomUUID } from "node:crypto";
import type { Express, Request } from "express";
import { createTravelCaseDraftSchema } from "@shared/contracts/travelCases";
import type { SupabaseTravelCaseStore } from "./supabaseTravelCaseStore";

function actor(request: Request) {
  const identity = request.tripflowIdentity;
  if (!identity?.companyCode) return null;
  const membership = identity.memberships.find((item) => item.organisationId === identity.companyCode && item.status === "active");
  if (!membership || typeof membership.id !== "string") return null;
  return {
    organisationId: identity.companyCode,
    membershipId: membership.id,
    role: identity.role,
    correlationId: request.header("x-correlation-id") || randomUUID(),
  };
}

function error(request: Request, status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return { error: { code, message, correlationId: request.header("x-correlation-id") || randomUUID(), ...(fieldErrors ? { fieldErrors } : {}) } };
}

export function registerTravelCaseRoutes(app: Express, store: SupabaseTravelCaseStore) {
  app.get("/api/v1/travel-cases", async (request, response) => {
    const context = actor(request);
    if (!context) return response.status(401).json(error(request, 401, "unauthenticated", "Authentication required"));
    try { return response.json(await store.list(context)); }
    catch { return response.status(503).json(error(request, 503, "service_unavailable", "Travel cases are temporarily unavailable")); }
  });

  app.get("/api/v1/travel-cases/:caseId", async (request, response) => {
    const context = actor(request);
    if (!context) return response.status(401).json(error(request, 401, "unauthenticated", "Authentication required"));
    if (!/^[0-9a-f-]{36}$/i.test(request.params.caseId)) return response.status(404).json(error(request, 404, "not_found", "Travel case not found"));
    try {
      const travelCase = await store.detail(context, request.params.caseId);
      return travelCase ? response.json(travelCase) : response.status(404).json(error(request, 404, "not_found", "Travel case not found"));
    } catch { return response.status(503).json(error(request, 503, "service_unavailable", "Travel cases are temporarily unavailable")); }
  });

  app.post("/api/v1/travel-cases", async (request, response) => {
    const context = actor(request);
    if (!context) return response.status(401).json(error(request, 401, "unauthenticated", "Authentication required"));
    const parsed = createTravelCaseDraftSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      return response.status(422).json(error(request, 422, "validation_failed", "Invalid travel case draft", fields));
    }
    try { return response.status(201).json(await store.createDraft(context, parsed.data)); }
    catch { return response.status(503).json(error(request, 503, "service_unavailable", "Travel case could not be created")); }
  });
}
