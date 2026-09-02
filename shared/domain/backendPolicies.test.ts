import { describe, expect, it } from "vitest";
import { commandPolicies, phaseOneRoutePolicies } from "./backendPolicies";

describe("Phase 1 backend policies", () => {
  it("defines every frontend route exactly once", () => {
    const keys = phaseOneRoutePolicies.map(({ method, path }) => `${method} ${path}`);
    expect(keys).toHaveLength(9);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses neutral not-found behavior for every case-specific route", () => {
    expect(phaseOneRoutePolicies
      .filter(({ scope }) => scope === "case")
      .every(({ neutralNotFound }) => neutralNotFound)).toBe(true);
  });

  it("requires replay and concurrency controls for material commands", () => {
    expect(commandPolicies["case.add_component"]).toMatchObject({
      idempotency: "required", concurrency: "expected_version",
    });
    expect(commandPolicies["case.submit"]).toMatchObject({
      idempotency: "required", concurrency: "expected_version",
    });
    expect(Object.values(commandPolicies).every(({ auditEvent }) => auditEvent.length > 0)).toBe(true);
  });
});
