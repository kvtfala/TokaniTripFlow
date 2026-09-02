import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseTravelCaseStore } from "./supabaseTravelCaseStore";

afterEach(() => vi.unstubAllGlobals());

const actor = {
  userId: "00000000-0000-4000-8000-000000000001",
  organisationId: "00000000-0000-4000-8000-000000000002",
  membershipId: "00000000-0000-4000-8000-000000000003",
  role: "employee",
  correlationId: "store-scope-test",
};

function storeWithFetch() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return { store: createSupabaseTravelCaseStore({ url: "https://example.supabase.co", secretKey: "server-secret" }), fetchMock };
}

describe("Supabase travel-case query scope", () => {
  it("limits ordinary users to owned or traveller cases", async () => {
    const { store, fetchMock } = storeWithFetch();
    await store.list(actor);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("organisation_id")).toBe(`eq.${actor.organisationId}`);
    expect(url.searchParams.get("or")).toContain(`owner_membership_id.eq.${actor.membershipId}`);
    expect(url.searchParams.get("or")).toContain(`traveller_user_id.eq.${actor.userId}`);
  });

  it("allows designated case-management roles to query the organisation queue", async () => {
    const { store, fetchMock } = storeWithFetch();
    await store.list({ ...actor, role: "coordinator" });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.has("or")).toBe(false);
  });

  it("does not treat tenant administration as operational case access", async () => {
    const { store, fetchMock } = storeWithFetch();
    await store.list({ ...actor, role: "organisation_admin" });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("or")).toContain(`owner_membership_id.eq.${actor.membershipId}`);
  });
});
