import { describe, expect, it } from "vitest";
import { apiErrorEnvelopeSchema } from "./api";

describe("standard API error envelope", () => {
  it("accepts a traceable validation error", () => {
    expect(apiErrorEnvelopeSchema.safeParse({
      error: {
        code: "validation_failed",
        message: "The request is incomplete",
        correlationId: "req_01J7YV7M3B6BRK",
        fieldErrors: { startDate: ["Start date is required"] },
      },
    }).success).toBe(true);
  });

  it("rejects untraceable and arbitrary errors", () => {
    expect(apiErrorEnvelopeSchema.safeParse({
      error: { code: "sql_failure", message: "failed" },
    }).success).toBe(false);
  });
});
