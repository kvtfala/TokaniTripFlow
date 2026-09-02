import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { apiOriginProtection, inMemoryRateLimit, isDemoAuthEnabled, registerHttpSecurity } from "./httpSecurity";

const openServers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function serve(configure: (app: express.Express) => void) {
  const app = express();
  configure(app);
  app.post("/api/test", (_request, response) => response.json({ ok: true }));
  const server = createServer(app);
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed");
  return `http://127.0.0.1:${address.port}`;
}

describe("HTTP security foundation", () => {
  it("never enables demo authentication in production", () => {
    expect(isDemoAuthEnabled({ NODE_ENV: "production", DEMO_AUTH_ENABLED: "true" })).toBe(false);
    expect(isDemoAuthEnabled({ NODE_ENV: "development", DEMO_AUTH_ENABLED: "true" })).toBe(true);
  });

  it("rejects cross-site API mutations", async () => {
    const baseUrl = await serve((app) => app.use(apiOriginProtection({ PUBLIC_APP_URL: "https://tripflow.example" })));
    const response = await fetch(`${baseUrl}/api/test`, { method: "POST", headers: { origin: "https://attacker.example" } });
    expect(response.status).toBe(403);
  });

  it("limits sensitive endpoints", async () => {
    const baseUrl = await serve((app) => app.use(inMemoryRateLimit({ windowMs: 60_000, limit: 1, paths: ["/api/test"] })));
    expect((await fetch(`${baseUrl}/api/test`, { method: "POST" })).status).toBe(200);
    const limited = await fetch(`${baseUrl}/api/test`, { method: "POST" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("sets baseline browser security headers", async () => {
    const baseUrl = await serve((app) => registerHttpSecurity(app));
    const response = await fetch(`${baseUrl}/api/test`, { method: "POST" });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-powered-by")).toBeNull();
  });
});
