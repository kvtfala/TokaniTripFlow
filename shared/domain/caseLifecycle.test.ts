import { describe, expect, it } from "vitest";
import {
  assertCaseTransition,
  assertTenantOwnership,
  canTransitionCase,
} from "./caseLifecycle";

describe("travel case lifecycle", () => {
  it("allows the approved forward lifecycle", () => {
    expect(canTransitionCase("draft", "submitted")).toBe(true);
    expect(canTransitionCase("authorised", "coordinating")).toBe(true);
    expect(canTransitionCase("in_travel", "completed")).toBe(true);
  });

  it("rejects skipped and terminal transitions", () => {
    expect(() => { assertCaseTransition("draft", "authorised"); }).toThrow();
    expect(() => { assertCaseTransition("completed", "in_travel"); }).toThrow();
    expect(() => { assertCaseTransition("cancelled", "submitted"); }).toThrow();
  });
});

describe("tenant ownership", () => {
  it("allows access only inside the active organisation", () => {
    expect(() => { assertTenantOwnership("org-a", "org-a"); }).not.toThrow();
    expect(() => { assertTenantOwnership("org-a", "org-b"); }).toThrow("Tenant access denied");
    expect(() => { assertTenantOwnership("", "org-a"); }).toThrow("Tenant access denied");
  });
});
