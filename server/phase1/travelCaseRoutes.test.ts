import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TravelCaseDetail } from "@shared/contracts/travelCases";
import { registerTravelCaseRoutes } from "./travelCaseRoutes";
import type { SupabaseTravelCaseStore } from "./supabaseTravelCaseStore";

const organisationId = "00000000-0000-4000-8000-000000000010";
const membershipId = "00000000-0000-4000-8000-000000000011";
const caseId = "00000000-0000-4000-8000-000000000012";
const detail: TravelCaseDetail = {
  id: caseId, referenceNumber: "TF-1", title: "Suva to Apia", purpose: "Meeting",
  status: "draft", priority: "normal", travellerDisplayName: null,
  destinationDisplayName: null, startDate: null, endDate: null,
  currentDependency: null, nextAction: null, version: 0,
  updatedAt: "2026-09-02T00:00:00.000Z", caseType: null,
  travellerUserId: null, destination: null, funding: null, components: [],
  availableActions: ["edit", "submit"],
};
const servers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

async function appServer(store: SupabaseTravelCaseStore, authenticated = true) {
  const app = express();
  app.use(express.json());
  if (authenticated) app.use((request, _response, next) => {
    request.tripflowIdentity = {
      id: "00000000-0000-4000-8000-000000000013", email: "user@example.com",
      firstName: "Trip", lastName: "User", profileImageUrl: null,
      role: "employee", companyCode: organisationId, isActive: true,
      memberships: [{ id: membershipId, organisationId, status: "active", role: "employee" }],
    };
    next();
  });
  registerTravelCaseRoutes(app, store);
  const server = createServer(app); servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("listen failed");
  return `http://127.0.0.1:${address.port}`;
}

function fakeStore(): SupabaseTravelCaseStore {
  return { list: vi.fn().mockResolvedValue([detail]), detail: vi.fn().mockResolvedValue(detail), createDraft: vi.fn().mockResolvedValue(detail) };
}

describe("membership-authorized travel-case routes", () => {
  it("derives tenant and membership from the server identity", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases`);
    expect(response.status).toBe(200);
    expect(store.list).toHaveBeenCalledWith(expect.objectContaining({ organisationId, membershipId, role: "employee" }));
  });

  it("rejects body attempts to override organisation authority", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Trip", purpose: "Meeting", organisationId: "attacker-org" }),
    });
    expect(response.status).toBe(422);
    expect(store.createDraft).not.toHaveBeenCalled();
  });

  it("returns a neutral not-found result for inaccessible case identifiers", async () => {
    const store = fakeStore(); vi.mocked(store.detail).mockResolvedValue(null); const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("organisation");
  });

  it("requires a validated active membership", async () => {
    const store = fakeStore(); const base = await appServer(store, false);
    expect((await fetch(`${base}/api/v1/travel-cases`)).status).toBe(401);
  });
});
