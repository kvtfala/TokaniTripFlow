import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "unauthenticated",
  "forbidden",
  "not_found",
  "validation_failed",
  "conflict",
  "rate_limited",
  "service_unavailable",
  "internal_error",
]);

export const correlationIdSchema = z.string().trim().min(8).max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, "Invalid correlation identifier");

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().trim().min(1).max(500),
    correlationId: correlationIdSchema,
    fieldErrors: z.record(z.string(), z.array(z.string().min(1))).optional(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
