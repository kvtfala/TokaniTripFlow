import { describe, expect, it } from "vitest";
import {
  createTravelCaseDraftSchema,
  issueAuthorityToProceedSchema,
  submitTravelCaseSchema,
  travelCaseDetailSchema,
  updateTravelCaseDraftSchema,
} from "./travelCases";

describe("B0 travel case contracts", () => {
  it("allows an incomplete operational draft", () => {
    expect(createTravelCaseDraftSchema.parse({
      title: "Suva to Apia",
      purpose: "Regional programme meeting",
    })).toMatchObject({ priority: "normal" });
  });

  it("accepts an honest detail response for an incomplete draft", () => {
    const result = travelCaseDetailSchema.safeParse({
      id: "case-1",
      referenceNumber: "DRAFT-0001",
      title: "Suva to Apia",
      purpose: "Regional programme meeting",
      status: "draft",
      priority: "normal",
      travellerUserId: null,
      travellerDisplayName: null,
      destinationDisplayName: null,
      startDate: null,
      endDate: null,
      currentDependency: null,
      nextAction: "Complete case details",
      version: 0,
      updatedAt: "2026-09-01T10:31:25.000Z",
      caseType: null,
      destination: null,
      funding: null,
      components: [],
      coordinatorMembershipId: null,
      informationRequests: [],
      approval: null,
      authoritiesToProceed: [],
      availableActions: ["edit", "submit", "cancel"],
    });

    expect(result.success).toBe(true);
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

  it("requires a version when updating a draft", () => {
    expect(updateTravelCaseDraftSchema.safeParse({ title: "Updated" }).success).toBe(false);
    expect(updateTravelCaseDraftSchema.safeParse({
      title: "Updated",
      expectedVersion: 3,
    }).success).toBe(true);
  });

  it("accepts a cost-centre-only formally submittable case", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      expectedVersion: 2,
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: true,
      caseType: "official",
      travellerUserId: "user-1",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      destination: { city: "Apia", country: "Samoa", airportCode: "apw" },
      funding: {
        costCentreId: "cost-centre-pac-01",
        purchaseOrderRequired: true,
      },
      requiredComponentTypes: ["flight", "accommodation", "transfer"],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.destination.airportCode).toBe("APW");
  });

  it("rejects legacy text funding as an authoritative link", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      expectedVersion: 2,
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: true,
      caseType: "official",
      travellerUserId: "user-1",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      destination: { city: "Apia", country: "Samoa" },
      funding: {
        costCentre: "PAC-01",
        fundingSource: "Regional programme",
      },
      requiredComponentTypes: ["flight"],
    });

    expect(result.success).toBe(false);
  });

  it("requires an affirmative requester attestation", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      expectedVersion: 0,
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: false,
    });
    expect(result.success).toBe(false);
  });

  it("keeps Authority to Proceed within the approved option and PO/LPO rules", () => {
    const base = {
      expectedVersion: 4, idempotencyKey: "00000000-0000-4000-8000-000000000060",
      providerId: "00000000-0000-4000-8000-000000000061",
      scopeComponentIds: ["00000000-0000-4000-8000-000000000062"],
      approvedOptionSource: "external_quote", approvedOptionReference: "QUOTE-1",
      approvedOptionVersion: 1, optionValidUntil: "2026-10-02T00:00:00.000Z",
      amountType: "exact", authorisedAmount: 1000, currency: "fjd",
      fundingMethod: "lpo_po", lpoRequirement: "before_authority",
      validUntil: "2026-10-01T00:00:00.000Z",
    } as const;
    expect(issueAuthorityToProceedSchema.safeParse(base).success).toBe(false);
    expect(issueAuthorityToProceedSchema.safeParse({ ...base, fundingReference: "LPO-100" }).success).toBe(true);
    expect(issueAuthorityToProceedSchema.safeParse({
      ...base, fundingReference: "LPO-100", validUntil: "2026-10-03T00:00:00.000Z",
    }).success).toBe(false);
  });

  it("requires at least one service component at submission", () => {
    const result = submitTravelCaseSchema.safeParse({
      expectedStatus: "draft",
      expectedVersion: 0,
      idempotencyKey: "65c9e815-1851-4d8a-a67a-48c9f4b3ccec",
      attestation: true,
      caseType: "corporate",
      travellerUserId: "user-1",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      destination: { city: "Nadi", country: "Fiji" },
      funding: { costCentreId: "cost-centre-sales" },
      requiredComponentTypes: [],
    });
    expect(result.success).toBe(false);
  });
});
