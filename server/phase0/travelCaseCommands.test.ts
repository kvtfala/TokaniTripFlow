import { describe, expect, it, vi } from "vitest";
import type { TravelCase } from "@shared/schema";
import {
  ProductionCoreDisabledError,
  transitionTravelCase,
} from "./travelCaseCommands";
import type { TravelCaseRepository } from "./travelCaseRepository";

function travelCase(overrides: Partial<TravelCase> = {}): TravelCase {
  return {
    id: "case-1",
    organisationId: "org-a",
    referenceNumber: "TF-0001",
    legacyRequestId: null,
    travellerUserId: null,
    title: "Suva to Apia",
    purpose: "Regional meeting",
    status: "submitted",
    priority: "normal",
    startDate: null,
    endDate: null,
    ownerMembershipId: null,
    submittedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function repository(current: TravelCase | undefined) {
  const findById = vi.fn().mockResolvedValue(current);
  const list = vi.fn().mockResolvedValue(current ? [current] : []);
  const transition = vi.fn().mockImplementation(async (_org, _id, _actor, _from, to) =>
    current ? travelCase({ ...current, status: to }) : undefined);
  const repo: TravelCaseRepository = { findById, list, transition };
  return { repo, findById, transition };
}

describe("travel case commands", () => {
  it("does nothing while the production core flag is disabled", async () => {
    const { repo, findById } = repository(travelCase());
    await expect(transitionTravelCase(repo, false, {
      organisationId: "org-a", caseId: "case-1", actorMembershipId: "member-1", to: "in_review",
    })).rejects.toBeInstanceOf(ProductionCoreDisabledError);
    expect(findById).not.toHaveBeenCalled();
  });

  it("performs a tenant-scoped valid transition", async () => {
    const { repo, transition } = repository(travelCase());
    const updated = await transitionTravelCase(repo, true, {
      organisationId: "org-a", caseId: "case-1", actorMembershipId: "member-1", to: "in_review",
    });
    expect(updated.status).toBe("in_review");
    expect(transition).toHaveBeenCalledWith(
      "org-a", "case-1", "member-1", "submitted", "in_review",
    );
  });

  it("cannot discover another tenant's case", async () => {
    const { repo } = repository(undefined);
    await expect(transitionTravelCase(repo, true, {
      organisationId: "org-b", caseId: "case-1", actorMembershipId: "member-2", to: "in_review",
    })).rejects.toThrow("Travel case not found");
  });
});
