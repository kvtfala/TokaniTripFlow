import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const fixture = `
CREATE TABLE users (id varchar PRIMARY KEY, role varchar, company_code varchar, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE vendors (id varchar PRIMARY KEY);
CREATE TABLE company_settings (display_name varchar NOT NULL, company_code varchar PRIMARY KEY, timezone varchar);
CREATE TABLE travel_requests (
  id varchar PRIMARY KEY, ttr_number varchar, company_code varchar, employee_id varchar,
  employee_name varchar NOT NULL, destination jsonb NOT NULL, purpose text NOT NULL,
  status varchar NOT NULL, ttc_priority varchar, start_date varchar, end_date varchar,
  submitted_at timestamp, needs_flights boolean, needs_accommodation boolean,
  needs_visa boolean, needs_transport boolean, history jsonb
);
INSERT INTO company_settings VALUES ('Island Test Tenant', 'test001', 'Pacific/Fiji');
INSERT INTO users VALUES ('user-1', 'manager', 'test001', true);
INSERT INTO travel_requests VALUES (
  'request-1', 'TTR-TEST-0001', 'test001', 'user-1', 'Test Traveller',
  '{"city":"Apia","country":"Samoa","code":"APW"}', 'Regional meeting',
  'submitted', 'normal', '2026-09-01', '2026-09-04', now(), true, true, false, true,
  '[{"ts":"2026-08-30T01:00:00Z","actor":"Test Traveller","action":"SUBMIT"}]'
);
`;

const productionCoreMigration = readFileSync(
  "migrations/0001_phase0_production_core.sql", "utf8",
);
const controlsMigration = readFileSync(
  "migrations/0003_phase0_controls.sql", "utf8",
);
const backfillMigration = readFileSync(
  "migrations/0002_phase0_backfill.sql", "utf8",
);

describe("Phase 0 migrations", () => {
  it("migrates and reconciles a legacy tenant twice without duplication", async () => {
    const db = new PGlite();
    await db.exec(fixture);
    await db.exec(productionCoreMigration);
    await db.exec(controlsMigration);
    await db.exec(backfillMigration);
    await db.exec(backfillMigration);

    const cases = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM travel_cases");
    const components = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM service_components");
    const events = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM case_events");
    expect(cases.rows[0].count).toBe(1);
    expect(components.rows[0].count).toBe(3);
    expect(events.rows[0].count).toBe(1);
    await db.close();
  }, 20_000);
});
