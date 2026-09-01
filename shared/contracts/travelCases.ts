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

export const createTravelCaseDraftSchema = z.object({
  title: z.string().trim().min(1).max(255),
  purpose: z.string().trim().min(1).max(4_000),
  caseType: caseTypeSchema.optional(),
  priority: casePrioritySchema.default("normal"),
  travellerUserId: z.string().trim().min(1).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  destination: destinationSchema.optional(),
  funding: fundingSelectionSchema.partial().optional(),
  requiredComponentTypes: z.array(serviceComponentTypeSchema).min(1).optional(),
}).superRefine((value, context) => {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date cannot be before start date",
    });
  }
});

export const updateTravelCaseDraftSchema = createTravelCaseDraftSchema.partial().extend({
  expectedVersion: z.number().int().nonnegative(),
}).superRefine((value, context) => {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date cannot be before start date",
    });
  }
});

export const submitTravelCaseSchema = z.object({
  expectedStatus: z.literal("draft"),
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
}).superRefine((value, context) => {
  if (value.endDate < value.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date cannot be before start date",
    });
  }
});

export const serviceComponentDraftSchema = z.object({
  type: serviceComponentTypeSchema,
  sequence: z.number().int().nonnegative(),
  requirements: z.record(z.unknown()),
});

export const addServiceComponentSchema = serviceComponentDraftSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
});

export const travelCaseActionSchema = z.enum([
  "edit",
  "submit",
  "review",
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
  availableActions: z.array(travelCaseActionSchema),
});

export type CreateTravelCaseDraft = z.infer<typeof createTravelCaseDraftSchema>;
export type UpdateTravelCaseDraft = z.infer<typeof updateTravelCaseDraftSchema>;
export type SubmitTravelCase = z.infer<typeof submitTravelCaseSchema>;
export type AddServiceComponent = z.infer<typeof addServiceComponentSchema>;
export type TravelCaseAction = z.infer<typeof travelCaseActionSchema>;
export type TravelCaseSummary = z.infer<typeof travelCaseSummarySchema>;
export type TravelCaseDetail = z.infer<typeof travelCaseDetailSchema>;

export const phaseOneTravelCaseRoutes = {
  list: { method: "GET", path: "/api/v1/travel-cases" },
  createDraft: { method: "POST", path: "/api/v1/travel-cases" },
  detail: { method: "GET", path: "/api/v1/travel-cases/:caseId" },
  updateDraft: { method: "PATCH", path: "/api/v1/travel-cases/:caseId/draft" },
  addComponent: { method: "POST", path: "/api/v1/travel-cases/:caseId/components" },
  submit: { method: "POST", path: "/api/v1/travel-cases/:caseId/submission" },
} as const;
