import { afterEach, describe, expect, it, vi } from "vitest";
import { travelCaseApi, travelCaseApiInternals, TravelCaseApiError } from "./travelCaseApi";

afterEach(() => vi.unstubAllGlobals());

describe("travelCaseApi", () => {
  it("encodes case identifiers when building a detail path", () => {
    expect(travelCaseApiInternals.casePath("/cases/:caseId", "case/one"))
      .toBe("/cases/case%2Fone");
  });

  it("maps hidden and cross-tenant resources to a neutral not-found error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(travelCaseApi.detail("other-tenant-case")).rejects.toEqual(
      expect.objectContaining<Partial<TravelCaseApiError>>({ status: 404, code: "not_found" }),
    );
  });

  it("rejects an API response that drifts from the shared contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([{ id: "case-1" }])));

    await expect(travelCaseApi.list()).rejects.toMatchObject({ name: "ZodError" });
  });
});
