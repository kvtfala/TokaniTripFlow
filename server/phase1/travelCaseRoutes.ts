import { randomUUID } from "node:crypto";
import type { Express, Request } from "express";
import { z } from "zod";
import { addServiceComponentSchema, claimTravelCaseReviewSchema, createTravelCaseDraftSchema, requestTravelCaseInformationSchema, submitTravelCaseSchema, updateServiceComponentSchema, updateTravelCaseDraftSchema } from "@shared/contracts/travelCases";
import { TravelCaseOperationError, type SupabaseTravelCaseStore } from "./supabaseTravelCaseStore";

function actor(request: Request) {
  const identity = request.tripflowIdentity;
  if (!identity?.isActive) return { failure: "unauthenticated" as const };
  const active = identity.memberships.flatMap((item) =>
    item.status === "active" && typeof item.organisationId === "string" && typeof item.id === "string" && typeof item.role === "string"
      ? [{ id: item.id, organisationId: item.organisationId, role: item.role }]
      : [],
  );
  const requestedOrganisation = request.header("x-tripflow-organisation-id");
  if (requestedOrganisation && !z.string().uuid().safeParse(requestedOrganisation).success) return { failure: "forbidden" as const };
  if (!requestedOrganisation && active.length > 1) return { failure: "organisation_context_required" as const };
  const organisationId = requestedOrganisation ?? active[0]?.organisationId;
  const membership = active.find((item) => item.organisationId === organisationId);
  if (!membership || typeof membership.id !== "string" || typeof membership.role !== "string") return { failure: "forbidden" as const };
  return { context: {
    userId: identity.id,
    organisationId,
    membershipId: membership.id,
    role: membership.role,
    correlationId: request.header("x-correlation-id") || randomUUID(),
  } };
}

function error(request: Request, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return { error: { code, message, correlationId: request.header("x-correlation-id") || randomUUID(), ...(fieldErrors ? { fieldErrors } : {}) } };
}

function contextOrError(request: Request, response: any) {
  const result = actor(request);
  if ("context" in result) return result.context;
  if (result.failure === "organisation_context_required") {
    response.status(409).json(error(request, "organisation_context_required", "Select an organisation before continuing"));
  } else if (result.failure === "forbidden") {
    response.status(403).json(error(request, "forbidden", "Organisation access is not permitted"));
  } else {
    response.status(401).json(error(request, "unauthenticated", "Authentication required"));
  }
  return null;
}

function operationError(request: Request, response: any, caught: unknown, fallback: string) {
  if (!(caught instanceof TravelCaseOperationError)) return response.status(503).json(error(request, "service_unavailable", fallback));
  if (caught.failure === "not_found") return response.status(404).json(error(request, "not_found", "Travel case not found"));
  if (caught.failure === "forbidden") return response.status(403).json(error(request, "forbidden", "This draft cannot be changed"));
  if (caught.failure === "conflict") return response.status(409).json(error(request, "version_conflict", "The travel case changed; refresh before trying again"));
  if (caught.failure === "validation") return response.status(422).json(error(request, "validation_failed", "The requested change is invalid"));
  return response.status(503).json(error(request, "service_unavailable", fallback));
}

const caseIdSchema = z.string().uuid();

export function registerTravelCaseRoutes(app: Express, store: SupabaseTravelCaseStore) {
  app.get("/api/v1/travel-cases", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    try { return response.json(await store.list(context)); }
    catch (caught) { return operationError(request, response, caught, "Travel cases are temporarily unavailable"); }
  });

  app.get("/api/v1/travel-cases/:caseId", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success) return response.status(404).json(error(request, "not_found", "Travel case not found"));
    try {
      const travelCase = await store.detail(context, request.params.caseId);
      return travelCase ? response.json(travelCase) : response.status(404).json(error(request, "not_found", "Travel case not found"));
    } catch (caught) { return operationError(request, response, caught, "Travel cases are temporarily unavailable"); }
  });

  app.post("/api/v1/travel-cases", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    const parsed = createTravelCaseDraftSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      return response.status(422).json(error(request, "validation_failed", "Invalid travel case draft", fields));
    }
    try { return response.status(201).json(await store.createDraft(context, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Travel case could not be created"); }
  });

  app.patch("/api/v1/travel-cases/:caseId/draft", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success) return response.status(404).json(error(request, "not_found", "Travel case not found"));
    const parsed = updateTravelCaseDraftSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json(error(request, "validation_failed", "Invalid draft update", parsed.error.flatten().fieldErrors as Record<string, string[]>));
    try { return response.json(await store.updateDraft(context, request.params.caseId, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Travel case could not be updated"); }
  });

  app.post("/api/v1/travel-cases/:caseId/components", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success) return response.status(404).json(error(request, "not_found", "Travel case not found"));
    const parsed = addServiceComponentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json(error(request, "validation_failed", "Invalid service component", parsed.error.flatten().fieldErrors as Record<string, string[]>));
    try { return response.status(201).json(await store.addComponent(context, request.params.caseId, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Service component could not be added"); }
  });

  app.patch("/api/v1/travel-cases/:caseId/components/:componentId", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success || !caseIdSchema.safeParse(request.params.componentId).success) return response.status(404).json(error(request, "not_found", "Travel case component not found"));
    const parsed = updateServiceComponentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json(error(request, "validation_failed", "Invalid service component update", parsed.error.flatten().fieldErrors as Record<string, string[]>));
    try { return response.json(await store.updateComponent(context, request.params.caseId, request.params.componentId, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Service component could not be updated"); }
  });

  app.post("/api/v1/travel-cases/:caseId/submission", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success) return response.status(404).json(error(request, "not_found", "Travel case not found"));
    const parsed = submitTravelCaseSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json(error(request, "validation_failed", "Travel case is not ready for submission", parsed.error.flatten().fieldErrors as Record<string, string[]>));
    try { return response.json(await store.submit(context, request.params.caseId, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Travel case could not be submitted"); }
  });

  app.post("/api/v1/travel-cases/:caseId/review-assignment", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success) return response.status(404).json(error(request, "not_found", "Travel case not found"));
    const parsed = claimTravelCaseReviewSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json(error(request, "validation_failed", "Invalid review assignment", parsed.error.flatten().fieldErrors as Record<string, string[]>));
    try { return response.json(await store.claimReview(context, request.params.caseId, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Travel case review could not be claimed"); }
  });

  app.post("/api/v1/travel-cases/:caseId/information-requests", async (request, response) => {
    const context = contextOrError(request, response);
    if (!context) return;
    if (!caseIdSchema.safeParse(request.params.caseId).success) return response.status(404).json(error(request, "not_found", "Travel case not found"));
    const parsed = requestTravelCaseInformationSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json(error(request, "validation_failed", "Invalid information request", parsed.error.flatten().fieldErrors as Record<string, string[]>));
    try { return response.status(201).json(await store.requestInformation(context, request.params.caseId, parsed.data)); }
    catch (caught) { return operationError(request, response, caught, "Information request could not be created"); }
  });
}
