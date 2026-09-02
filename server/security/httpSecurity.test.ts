import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { retireLegacyApiWhenSupabaseEnabled } from "./httpSecurity";

const servers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

async function start(enabled: boolean) {
  const app = express();
  app.use(retireLegacyApiWhenSupabaseEnabled(enabled));
  app.get("/api/v1/travel-cases", (_request, response) => response.sendStatus(204));
  app.get("/api/token-approve/secret", (_request, response) => response.sendStatus(204));
  const server = createServer(app); servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to listen");
  return `http://127.0.0.1:${address.port}`;
}

describe("legacy API retirement", () => {
  it("permits only versioned APIs when Supabase is active", async () => {
    const base = await start(true);
    expect((await fetch(`${base}/api/v1/travel-cases`)).status).toBe(204);
    const legacy = await fetch(`${base}/api/token-approve/secret`);
    expect(legacy.status).toBe(410);
    expect(await legacy.json()).toMatchObject({ error: { code: "legacy_endpoint_retired" } });
  });

  it("does not affect development-only legacy mode", async () => {
    const base = await start(false);
    expect((await fetch(`${base}/api/token-approve/secret`)).status).toBe(204);
  });
});
