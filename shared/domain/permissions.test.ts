import { describe, expect, it } from "vitest";
import { canPerform, canReadClassification } from "./permissions";

describe("B0 permission contract", () => {
  it("separates approval, authority and finance powers", () => {
    expect(canPerform("approver", "case:approve")).toBe(true);
    expect(canPerform("approver", "authority:issue")).toBe(false);
    expect(canPerform("finance_admin", "finance:manage")).toBe(true);
    expect(canPerform("finance_admin", "case:approve")).toBe(false);
  });

  it("keeps tenant administration separate from operational data", () => {
    expect(canPerform("organisation_admin", "tenant:admin")).toBe(true);
    expect(canPerform("organisation_admin", "case:read")).toBe(false);
    expect(canPerform("organisation_admin", "document:read")).toBe(false);
  });

  it("requires an explicit restricted-data permission", () => {
    expect(canReadClassification("employee", "confidential")).toBe(true);
    expect(canReadClassification("employee", "restricted")).toBe(false);
    expect(canReadClassification("travel_admin", "restricted")).toBe(false);
    expect(canReadClassification(
      "travel_admin",
      "restricted",
      { hasRestrictedDataPermission: true },
    )).toBe(true);
  });

  it("does not let tenant administration override restricted access", () => {
    expect(canReadClassification(
      "organisation_admin",
      "restricted",
      { hasRestrictedDataPermission: true },
    )).toBe(false);
  });
});
