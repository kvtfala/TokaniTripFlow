import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TravelCaseDetail } from "@shared/contracts/travelCases";
import { registerTravelCaseRoutes } from "./travelCaseRoutes";
import { TravelCaseOperationError } from "./supabaseTravelCaseStore";
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

async function appServer(
  store: SupabaseTravelCaseStore,
  authenticated = true,
  memberships: Array<Record<string, unknown>> = [{ id: membershipId, organisationId, status: "active", role: "employee" }],
) {
  const app = express();
  app.use(express.json());
  if (authenticated) app.use((request, _response, next) => {
    request.tripflowIdentity = {
      id: "00000000-0000-4000-8000-000000000013", email: "user@example.com",
      firstName: "Trip", lastName: "User", profileImageUrl: null,
      role: "employee", companyCode: organisationId, isActive: true,
      memberships,
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
  return {
    list: vi.fn().mockResolvedValue([detail]),
    detail: vi.fn().mockResolvedValue(detail),
    createDraft: vi.fn().mockResolvedValue(detail),
    updateDraft: vi.fn().mockResolvedValue({ ...detail, version: 1 }),
    addComponent: vi.fn().mockResolvedValue({ ...detail, version: 1 }),
    submit: vi.fn().mockResolvedValue({ ...detail, status: "submitted", version: 1 }),
  };
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

  it("requires an explicit organisation context for multi-organisation users", async () => {
    const secondOrganisation = "00000000-0000-4000-8000-000000000030";
    const secondMembership = "00000000-0000-4000-8000-000000000031";
    const memberships = [
      { id: membershipId, organisationId, status: "active", role: "employee" },
      { id: secondMembership, organisationId: secondOrganisation, status: "active", role: "coordinator" },
    ];
    const store = fakeStore(); const base = await appServer(store, true, memberships);
    expect((await fetch(`${base}/api/v1/travel-cases`)).status).toBe(409);
    const selected = await fetch(`${base}/api/v1/travel-cases`, {
      headers: { "x-tripflow-organisation-id": secondOrganisation },
    });
    expect(selected.status).toBe(200);
    expect(store.list).toHaveBeenCalledWith(expect.objectContaining({
      organisationId: secondOrganisation,
      membershipId: secondMembership,
      role: "coordinator",
    }));
  });

  it("updates drafts with optimistic concurrency data", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}/draft`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated trip", expectedVersion: 0 }),
    });
    expect(response.status).toBe(200);
    expect(store.updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId, membershipId }),
      caseId,
      { title: "Updated trip", expectedVersion: 0 },
    );
  });

  it("maps stale draft versions to a safe conflict response", async () => {
    const store = fakeStore(); vi.mocked(store.updateDraft).mockRejectedValue(new TravelCaseOperationError("conflict"));
    const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}/draft`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated trip", expectedVersion: 0 }),
    });
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain("Supabase");
  });

  it("requires an idempotency key when adding a component", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}/components`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "flight", sequence: 0, requirements: {}, expectedVersion: 0 }),
    });
    expect(response.status).toBe(422);
    expect(store.addComponent).not.toHaveBeenCalled();
  });

  it("adds components through the tenant-scoped store", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const payload = { type: "flight", sequence: 0, requirements: {}, expectedVersion: 0, idempotencyKey: "00000000-0000-4000-8000-000000000020" };
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}/components`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    expect(response.status).toBe(201);
    expect(store.addComponent).toHaveBeenCalledWith(expect.objectContaining({ organisationId }), caseId, payload);
  });

  it("rejects incomplete formal submissions", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}/submission`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedStatus: "draft", expectedVersion: 0, attestation: true, idempotencyKey: "00000000-0000-4000-8000-000000000040" }),
    });
    expect(response.status).toBe(422);
    expect(store.submit).not.toHaveBeenCalled();
  });

  it("submits a complete case through the tenant-scoped transaction", async () => {
    const store = fakeStore(); const base = await appServer(store);
    const payload = {
      expectedStatus: "draft", expectedVersion: 0,
      idempotencyKey: "00000000-0000-4000-8000-000000000040", attestation: true,
      caseType: "corporate", travellerUserId: "00000000-0000-4000-8000-000000000013",
      startDate: "2026-10-01", endDate: "2026-10-02",
      destination: { city: "Suva", country: "Fiji" },
      funding: { costCentreId: "CC-1", purchaseOrderRequired: false },
      requiredComponentTypes: ["flight"],
    };
    const response = await fetch(`${base}/api/v1/travel-cases/${caseId}/submission`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    expect(response.status).toBe(200);
    expect(store.submit).toHaveBeenCalledWith(expect.objectContaining({ organisationId }), caseId, payload);
  });
});
