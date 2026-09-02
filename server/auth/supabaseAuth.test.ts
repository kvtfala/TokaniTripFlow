import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readSupabaseAuthConfig, registerSupabaseAuthRoutes } from "./supabaseAuth";

const session = {
  access_token: "access-token-must-remain-in-cookie",
  refresh_token: "refresh-token-must-remain-in-cookie",
  expires_in: 3600,
  user: { id: "00000000-0000-4000-8000-000000000001", email: "owner@example.com" },
};

function jwt(aal: "aal1" | "aal2") {
  return `header.${Buffer.from(JSON.stringify({ aal })).toString("base64url")}.signature`;
}

const openServers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function testServer(fetchImpl: typeof fetch) {
  const app = express();
  app.use(express.json());
  registerSupabaseAuthRoutes(app, {
    url: "https://tripflow.supabase.co",
    publishableKey: "sb_publishable_test",
    production: true,
    allowedOrigins: [],
  }, fetchImpl);
  const server = createServer(app);
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to listen");
  return `http://127.0.0.1:${address.port}`;
}

describe("Supabase authentication boundary", () => {
  it("fails closed when server Auth configuration is incomplete", () => {
    expect(readSupabaseAuthConfig({ SUPABASE_URL: "https://tripflow.supabase.co" })).toBeNull();
  });

  it("keeps tokens in secure HttpOnly cookies and returns only safe identity fields", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/auth/v1/token")) return Response.json(session);
      if (url.endsWith("/auth/v1/user")) return Response.json(session.user);
      if (url.includes("user_profiles")) return Response.json([{ user_id: session.user.id, display_name: "Trip Flow", time_zone: "Pacific/Fiji", locale: "en-FJ" }]);
      if (url.includes("organisation_memberships")) return Response.json([{
        id: "00000000-0000-4000-8000-000000000002",
        organisation_id: "00000000-0000-4000-8000-000000000003",
        user_id: session.user.id, role: "super_admin", status: "active", activated_at: "2026-09-01T00:00:00Z",
      }]);
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;
    const baseUrl = await testServer(fetchImpl);
    const response = await fetch(`${baseUrl}/api/v1/auth/sign-in`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email: "owner@example.com", password: "correct-password" }),
    });
    const body = await response.text();
    const cookies = response.headers.getSetCookie();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => /HttpOnly/i.test(cookie))).toBe(true);
    expect(cookies.every((cookie) => /Secure/i.test(cookie))).toBe(true);
    expect(cookies.every((cookie) => /SameSite=Lax/i.test(cookie))).toBe(true);
    expect(body).not.toContain(session.access_token);
    expect(body).not.toContain(session.refresh_token);
    expect(JSON.parse(body)).toMatchObject({
      id: session.user.id,
      role: "super_admin",
      isActive: true,
      authenticatorAssuranceLevel: "aal1",
      mfaRequired: true,
      mfaVerified: false,
    });
  });

  it("uses a generic response for password reset requests", async () => {
    const fetchImpl = vi.fn(async () => new Response("upstream failure", { status: 500 })) as unknown as typeof fetch;
    const baseUrl = await testServer(fetchImpl);
    const response = await fetch(`${baseUrl}/api/v1/auth/password-reset`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email: "unknown@example.com" }),
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
  });

  it("returns only safe MFA factor metadata", async () => {
    const factorId = "00000000-0000-4000-8000-000000000021";
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith("/auth/v1/factors")) return Response.json({ all: [{
        id: factorId, factor_type: "totp", friendly_name: "Phone", status: "verified",
        created_at: "2026-09-02T00:00:00Z", secret: "must-not-leak",
      }] });
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;
    const baseUrl = await testServer(fetchImpl);
    const response = await fetch(`${baseUrl}/api/v1/auth/mfa/factors`, {
      headers: { cookie: `__Host-tripflow_access=${jwt("aal1")}` },
    });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).not.toContain("must-not-leak");
    expect(JSON.parse(body)).toEqual({ factors: [{ id: factorId, type: "totp", friendlyName: "Phone", status: "verified", createdAt: "2026-09-02T00:00:00Z" }] });
  });

  it("enrolls, challenges, and promotes a verified session to AAL2", async () => {
    const factorId = "00000000-0000-4000-8000-000000000021";
    const challengeId = "00000000-0000-4000-8000-000000000022";
    const aal2Session = { ...session, access_token: jwt("aal2") };
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/factors") && init?.method === "POST") return Response.json({
        id: factorId, type: "totp", totp: { qr_code: "data:image/svg+xml,test", secret: "SETUPKEY", uri: "otpauth://totp/TripFlow" },
      });
      if (url.endsWith(`/auth/v1/factors/${factorId}/challenge`)) return Response.json({ id: challengeId });
      if (url.endsWith(`/auth/v1/factors/${factorId}/verify`)) return Response.json(aal2Session);
      if (url.endsWith("/auth/v1/user")) return Response.json(session.user);
      if (url.includes("user_profiles")) return Response.json([{ display_name: "Trip Flow" }]);
      if (url.includes("organisation_memberships")) return Response.json([{
        id: "00000000-0000-4000-8000-000000000002", organisation_id: "00000000-0000-4000-8000-000000000003",
        user_id: session.user.id, role: "super_admin", status: "active", activated_at: "2026-09-01T00:00:00Z",
      }]);
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;
    const baseUrl = await testServer(fetchImpl);
    const headers = { "content-type": "application/json", origin: baseUrl, cookie: `__Host-tripflow_access=${jwt("aal1")}` };
    const enrollment = await fetch(`${baseUrl}/api/v1/auth/mfa/enroll`, { method: "POST", headers, body: "{}" });
    expect(enrollment.status).toBe(201);
    expect(await enrollment.json()).toMatchObject({ factorId, secret: "SETUPKEY" });
    const challenge = await fetch(`${baseUrl}/api/v1/auth/mfa/challenge`, { method: "POST", headers, body: JSON.stringify({ factorId }) });
    expect(await challenge.json()).toEqual({ challengeId });
    const verification = await fetch(`${baseUrl}/api/v1/auth/mfa/verify`, {
      method: "POST", headers, body: JSON.stringify({ factorId, challengeId, code: "123456" }),
    });
    expect(verification.status).toBe(200);
    expect(await verification.json()).toMatchObject({ authenticatorAssuranceLevel: "aal2", mfaVerified: true });
    expect(verification.headers.getSetCookie().every((cookie) => /HttpOnly/i.test(cookie))).toBe(true);
  });
});
