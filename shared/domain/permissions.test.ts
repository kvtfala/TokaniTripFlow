import { describe, expect, it } from "vitest";
import { canPerform, canReadClassification } from "./permissions";

describe("Phase 0 permission contract", () => {
  it("separates approval, authority and finance powers", () => {
    expect(canPerform("approver", "case:approve")).toBe(true);
    expect(canPerform("approver", "case:authorise")).toBe(false);
    expect(canPerform("finance_admin", "case:finance")).toBe(true);
    expect(canPerform("finance_admin", "case:approve")).toBe(false);
  });

  it("restricts the highest document classification", () => {
    expect(canReadClassification("employee", "confidential")).toBe(true);
    expect(canReadClassification("employee", "restricted")).toBe(false);
    expect(canReadClassification("travel_admin", "restricted")).toBe(true);
  });
});

