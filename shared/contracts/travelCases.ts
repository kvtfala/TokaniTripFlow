import { z } from "zod";
import { caseStatusSchema, serviceComponentTypeSchema } from "@shared/schema";

export const caseTypeSchema = z.enum([
  "corporate",
  "official",
  "project",
  "group",
  "urgent",
  "medical_related",
  "other",
]);

export const casePrioritySchema = z.enum(["normal", "high", "urgent"]);

export const destinationSchema = z.object({
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  airportCode: z.string().trim().length(3).toUpperCase().optional(),
});

/**
 * Funding selections use stable server-controlled identifiers. Names and codes
 * are presentation data and must never be accepted as authoritative links.
 * A cost-centre-only case is valid; project, funding source and budget remain
 * optional so tenant policy can determine when they are required.
 */
export const fundingSelectionSchema = z.object({
  costCentreId: z.string().trim().min(1).max(100),
  projectId: z.string().trim().min(1).max(100).optional(),
  fundingSourceId: z.string().trim().min(1).max(100).optional(),
  budgetId: z.string().trim().min(1).max(100).optional(),
  purchaseOrderRequired: z.boolean().default(false),
});

// Compatibility name for consumers while B0 replaces legacy text fields.
export const fundingSchema = fundingSelectionSchema;

const createTravelCaseDraftFieldsSchema = z.object({
  title: z.string().trim().min(1).max(255),
  purpose: z.string().trim().min(1).max(4_000),
  caseType: caseTypeSchema.optional(),
  priority: casePrioritySchema.default("normal"),
  travellerUserId: z.string().uuid().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  destination: destinationSchema.optional(),
  funding: fundingSelectionSchema.partial().optional(),
  requiredComponentTypes: z.array(serviceComponentTypeSchema).min(1).optional(),
}).strict();

function validateDateRange(
  value: { startDate?: string; endDate?: string },
  context: z.RefinementCtx,
): void {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date cannot be before start date",
    });
  }
}

export const createTravelCaseDraftSchema =
  createTravelCaseDraftFieldsSchema.superRefine(validateDateRange);

export const updateTravelCaseDraftSchema =
  z.object({
    title: z.string().trim().min(1).max(255).optional(),
    purpose: z.string().trim().min(1).max(4_000).optional(),
    caseType: caseTypeSchema.nullable().optional(),
    priority: casePrioritySchema.optional(),
    travellerUserId: z.string().uuid().nullable().optional(),
    startDate: z.string().date().nullable().optional(),
    endDate: z.string().date().nullable().optional(),
    destination: destinationSchema.nullable().optional(),
    funding: fundingSelectionSchema.partial().nullable().optional(),
    requiredComponentTypes: z.array(serviceComponentTypeSchema).min(1).optional(),
    expectedVersion: z.number().int().nonnegative(),
  }).strict().superRefine((value, context) => {
    validateDateRange({
      startDate: value.startDate ?? undefined,
      endDate: value.endDate ?? undefined,
    }, context);
    if (Object.keys(value).every((key) => key === "expectedVersion")) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "At least one draft field must change" });
    }
  });

export const submitTravelCaseSchema = z.object({
  expectedStatus: z.enum(["draft", "information_required"]),
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  attestation: z.literal(true),
  caseType: caseTypeSchema,
  travellerUserId: z.string().trim().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  destination: destinationSchema,
  funding: fundingSelectionSchema,
  requiredComponentTypes: z.array(serviceComponentTypeSchema).min(1),
  responseSummary: z.string().trim().min(1).max(4_000).optional(),
}).superRefine((value, context) => {
  validateDateRange(value, context);
  if (value.expectedStatus === "information_required" && !value.responseSummary) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["responseSummary"], message: "Explain how the requested information was addressed" });
  }
});

export const serviceComponentDraftSchema = z.object({
  type: serviceComponentTypeSchema,
  sequence: z.number().int().nonnegative(),
  requirements: z.record(z.unknown()),
}).strict();

export const addServiceComponentSchema = serviceComponentDraftSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
}).strict();

export const updateServiceComponentSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  sequence: z.number().int().nonnegative().optional(),
  requirements: z.record(z.unknown()).optional(),
  disposition: z.enum(["active", "withdrawn"]).optional(),
}).strict().refine(
  (value) => value.sequence !== undefined || value.requirements !== undefined || value.disposition !== undefined,
  { message: "At least one component field must change" },
);

export const claimTravelCaseReviewSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
}).strict();

export const requestTravelCaseInformationSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  reason: z.string().trim().min(10).max(4_000),
  requestedFields: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
  dueDate: z.string().date().optional(),
}).strict();

export const completeTravelCaseReviewSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  policyEvaluation: z.record(z.unknown()),
  notes: z.string().trim().min(1).max(4_000).optional(),
}).strict();

export const approvalDecisionSchema = z.object({
  requirementId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  decision: z.enum(["approve", "reject", "return_for_information"]),
  reason: z.string().trim().min(3).max(4_000),
}).strict();

export const approvalWorkItemSchema = z.object({
  requirementId: z.string(), travelCaseId: z.string(), referenceNumber: z.string(), title: z.string(),
  stageSequence: z.number().int().positive(), subject: z.string(),
  requiredRole: z.enum(["approver", "manager", "finance_admin"]),
  dueAt: z.string().datetime().nullable(), submissionSnapshotId: z.string(),
  subjectVersion: z.record(z.unknown()),
});

export const travelCaseActionSchema = z.enum([
  "edit",
  "submit",
  "review",
  "request_information",
  "approve",
  "authorise",
  "coordinate",
  "upload_document",
  "cancel",
]);

export const travelCaseSummarySchema = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  title: z.string(),
  status: caseStatusSchema,
  priority: casePrioritySchema,
  travellerDisplayName: z.string().nullable(),
  destinationDisplayName: z.string().nullable(),
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  currentDependency: z.string().nullable(),
  nextAction: z.string().nullable(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

/**
 * Detail responses represent both incomplete drafts and submitted cases.
 * Nullable fields are intentional: an initial draft needs only title and
 * purpose. Submission validation remains strict in submitTravelCaseSchema.
 */
export const travelCaseDetailSchema = travelCaseSummarySchema.extend({
  purpose: z.string(),
  caseType: caseTypeSchema.nullable(),
  travellerUserId: z.string().nullable(),
  destination: destinationSchema.nullable(),
  funding: fundingSelectionSchema.partial().nullable(),
  components: z.array(serviceComponentDraftSchema.extend({
    id: z.string(),
    status: z.string(),
    providerId: z.string().nullable(),
    providerReference: z.string().nullable(),
  })),
  coordinatorMembershipId: z.string().nullable(),
  informationRequests: z.array(z.object({
    id: z.string(),
    reason: z.string(),
    requestedFields: z.array(z.string()),
    dueDate: z.string().date().nullable(),
    requestedAt: z.string().datetime(),
    respondedAt: z.string().datetime().nullable(),
  })),
  approval: z.object({
    cycleId: z.string(),
    cycleNumber: z.number().int().positive(),
    status: z.enum(["pending", "approved", "rejected", "returned", "superseded"]),
    requirements: z.array(z.object({
      id: z.string(), stageSequence: z.number().int().positive(), subject: z.string(),
      requiredRole: z.enum(["approver", "manager", "finance_admin"]),
      status: z.enum(["pending", "approved", "rejected", "returned", "superseded"]),
      dueAt: z.string().datetime().nullable(),
    })),
  }).nullable(),
  availableActions: z.array(travelCaseActionSchema),
});

export type CreateTravelCaseDraft = z.infer<typeof createTravelCaseDraftSchema>;
export type UpdateTravelCaseDraft = z.infer<typeof updateTravelCaseDraftSchema>;
export type SubmitTravelCase = z.infer<typeof submitTravelCaseSchema>;
export type AddServiceComponent = z.infer<typeof addServiceComponentSchema>;
export type UpdateServiceComponent = z.infer<typeof updateServiceComponentSchema>;
export type ClaimTravelCaseReview = z.infer<typeof claimTravelCaseReviewSchema>;
export type RequestTravelCaseInformation = z.infer<typeof requestTravelCaseInformationSchema>;
export type CompleteTravelCaseReview = z.infer<typeof completeTravelCaseReviewSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type ApprovalWorkItem = z.infer<typeof approvalWorkItemSchema>;
export type TravelCaseAction = z.infer<typeof travelCaseActionSchema>;
export type TravelCaseSummary = z.infer<typeof travelCaseSummarySchema>;
export type TravelCaseDetail = z.infer<typeof travelCaseDetailSchema>;

export const phaseOneTravelCaseRoutes = {
  list: { method: "GET", path: "/api/v1/travel-cases" },
  createDraft: { method: "POST", path: "/api/v1/travel-cases" },
  detail: { method: "GET", path: "/api/v1/travel-cases/:caseId" },
  updateDraft: { method: "PATCH", path: "/api/v1/travel-cases/:caseId/draft" },
  addComponent: { method: "POST", path: "/api/v1/travel-cases/:caseId/components" },
  updateComponent: { method: "PATCH", path: "/api/v1/travel-cases/:caseId/components/:componentId" },
  submit: { method: "POST", path: "/api/v1/travel-cases/:caseId/submission" },
  claimReview: { method: "POST", path: "/api/v1/travel-cases/:caseId/review-assignment" },
  requestInformation: { method: "POST", path: "/api/v1/travel-cases/:caseId/information-requests" },
  completeReview: { method: "POST", path: "/api/v1/travel-cases/:caseId/review-outcome" },
  recordApprovalDecision: { method: "POST", path: "/api/v1/travel-cases/:caseId/approval-decisions" },
  approvalWork: { method: "GET", path: "/api/v1/approval-requirements" },
} as const;
