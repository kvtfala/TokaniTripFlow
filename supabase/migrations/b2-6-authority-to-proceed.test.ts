import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const base = readFileSync(
  new URL("./20260902121000_b2_6_authority_to_proceed.sql", import.meta.url),
  "utf8",
);
const transactionHardening = readFileSync(
  new URL("./20260902123000_b2_6_atp_transaction_hardening.sql", import.meta.url),
  "utf8",
);

describe("B2.6 Authority to Proceed migrations", () => {
  it("keeps provider and authority evidence behind forced RLS", () => {
    expect(base).toContain("alter table public.organisation_providers force row level security");
    expect(base).toContain("alter table public.authorities_to_proceed force row level security");
    expect(base).toContain("revoke all on table public.organisation_providers, public.authorities_to_proceed from public, anon, authenticated");
  });

  it("keeps sensitive transactions invoker-mode and service-role only", () => {
    expect(base.match(/security invoker/g)).toHaveLength(2);
    expect(base).toContain("grant execute on function public.issue_authority_to_proceed");
    expect(base).toContain("to service_role");
    expect(base).toContain("from public, anon, authenticated");
  });

  it("authorises the actor before an idempotent response", () => {
    const membershipCheck = transactionHardening.indexOf("select * into membership");
    const idempotencyCheck = transactionHardening.indexOf("select * into existing");
    expect(membershipCheck).toBeGreaterThan(-1);
    expect(membershipCheck).toBeLessThan(idempotencyCheck);
  });

  it("requires the newest approval cycle itself to be approved", () => {
    expect(transactionHardening).toContain("order by c.cycle_number desc limit 1");
    expect(transactionHardening).toContain("if not found or cycle.status <> 'approved'");
    expect(transactionHardening).not.toContain("and c.status='approved' order by c.cycle_number desc");
  });

  it("records the true prior status for partial authorities", () => {
    expect(transactionHardening).toContain("previous_status := current_case.status");
    expect(transactionHardening).toContain("previous_status,'authorised'");
  });
});
