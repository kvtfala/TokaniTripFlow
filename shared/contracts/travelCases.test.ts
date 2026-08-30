import { describe, expect, it } from "vitest";
import {
  createTravelCaseDraftSchema,
  submitTravelCaseSchema,
} from "./travelCases";

describe("Phase 1 travel case contracts", () => {
  it("allows an incomplete operational draft", () => {
    expect(createTravelCaseDraftSchema.parse({
      title: "Suva to Apia",
      purpose: "Regional programme meeting",
    })).toMatchObject({ priority: "normal" });
  });

  it("rejects a reversed draft date range", () => {
    const result = createTravelCaseDraftSchema.safeParse({
      title: "Suva to Apia",
      purpose: "Regional programme meeting",
      startDate: "2026-09-10",
      endDate: "2026-09-08",
    });
    expect(result.success).toBe(false);
  });

  it("accepts the minimum formally submittable case", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: true,
      caseType: "official",
      travellerUserId: "user-1",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      destination: { city: "Apia", country: "Samoa", airportCode: "apw" },
      funding: {
        costCentre: "PAC-01",
        fundingSource: "Regional programme",
        purchaseOrderRequired: true,
      },
      requiredComponentTypes: ["flight", "accommodation", "transfer"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.destination.airportCode).toBe("APW");
  });

  it("requires an affirmative requester attestation", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one service component at submission", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: true,
      caseType: "corporate",
      travellerUserId: "user-1",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      destination: { city: "Nadi", country: "Fiji" },
      funding: { costCentre: "SALES", fundingSource: "Operating budget" },
      requiredComponentTypes: [],
    });
    expect(result.success).toBe(false);
  });
});
