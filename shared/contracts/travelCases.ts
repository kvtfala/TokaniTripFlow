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

export const fundingSchema = z.object({
  costCentre: z.string().trim().min(1).max(100),
  projectCode: z.string().trim().min(1).max(100).optional(),
  fundingSource: z.string().trim().min(1).max(160),
  purchaseOrderRequired: z.boolean().default(false),
});

export const createTravelCaseDraftSchema = z.object({
  title: z.string().trim().min(1).max(255),
  purpose: z.string().trim().min(1).max(4_000),
  caseType: caseTypeSchema.optional(),
  priority: casePrioritySchema.default("normal"),
  travellerUserId: z.string().trim().min(1).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  destination: destinationSchema.optional(),
  funding: fundingSchema.partial().optional(),
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

export const submitTravelCaseSchema = z.object({
  expectedStatus: z.literal("draft"),
  idempotencyKey: z.string().uuid(),
  attestation: z.literal(true),
  caseType: caseTypeSchema,
  travellerUserId: z.string().trim().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  destination: destinationSchema,
  funding: fundingSchema,
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

export const travelCaseSummarySchema = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  title: z.string(),
  status: caseStatusSchema,
  priority: casePrioritySchema,
  travellerDisplayName: z.string(),
  destinationDisplayName: z.string().nullable(),
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  currentDependency: z.string().nullable(),
  nextAction: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export const travelCaseDetailSchema = travelCaseSummarySchema.extend({
  purpose: z.string(),
  caseType: caseTypeSchema,
  destination: destinationSchema,
  funding: fundingSchema,
  components: z.array(serviceComponentDraftSchema.extend({
    id: z.string(),
    status: z.string(),
    providerId: z.string().nullable(),
    providerReference: z.string().nullable(),
  })),
  availableActions: z.array(z.enum([
    "edit",
    "submit",
    "review",
    "approve",
    "authorise",
    "coordinate",
    "upload_document",
    "cancel",
  ])),
});

export type CreateTravelCaseDraft = z.infer<typeof createTravelCaseDraftSchema>;
export type SubmitTravelCase = z.infer<typeof submitTravelCaseSchema>;
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
