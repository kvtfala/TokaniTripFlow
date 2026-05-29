/**
 * server/dbInit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Startup-safe idempotent initializer for DbStorage.
 *
 * Called once at server boot BEFORE any routes are registered.
 * Ensures the demo users required for /api/demo-login exist in the database
 * so that demo credentials work on a fresh database environment without
 * requiring a manual seed script run.
 *
 * Safe to call multiple times — uses ON CONFLICT DO NOTHING.
 */

import { db } from "./db";
import { users } from "@shared/schema";
import { count } from "drizzle-orm";
import { randomUUID } from "crypto";

// These hashes were generated with bcrypt (cost 10).
// ITT plaintext password: itt1235*
// CDP plaintext password: see CDP demo login credentials
const DEMO_HASH = "$2b$10$btwIziGooE5YvHpoZJxjjeYgqya3zJPk2EWmSmW.p2/Ck6r64rUGS";
const CDP_DEMO_HASH = "$2b$10$DOF5lGyFep2rEma0gSVYn./NHcD2TFRKE8Av.d/aY1ZinHcu5UNUe";

const DEMO_USERS = [
  // ── Island Travel Technologies (itt001) ──────────────────────────────────
  { id: "user-itt-manager-001", email: "desmond.bale@islandtraveltech.com",     firstName: "Desmond",   lastName: "Bale",      role: "super_admin",   companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-employee-001", email: "jone.ratudina@islandtraveltech.com",   firstName: "Jone",      lastName: "Ratudina",  role: "employee",      companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-coordinator-001", email: "litia.vuniyayawa@islandtraveltech.com", firstName: "Litia", lastName: "Vuniyayawa", role: "coordinator", companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-manager-002", email: "tomasi.ravouvou@islandtraveltech.com",  firstName: "Tomasi",    lastName: "Ravouvou",  role: "manager",       companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-finance-001", email: "mere.delana@islandtraveltech.com",      firstName: "Mere",      lastName: "Delana",    role: "finance_admin", companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-travel-001",  email: "nemani.tui@islandtraveltech.com",       firstName: "Nemani",    lastName: "Tui",       role: "travel_admin",  companyCode: "itt001", passwordHash: DEMO_HASH },
  // ── CDP Couriers (cdp001) ─────────────────────────────────────────────────
  { id: "user-cdp-md-001",  email: "sashi.singh@cdpcouriers.demo",   firstName: "Sashi",     lastName: "Singh", role: "super_admin",   companyCode: "cdp001", passwordHash: CDP_DEMO_HASH },
  { id: "user-cdp-ceo-001", email: "rajnil.singh@cdpcouriers.demo",  firstName: "Rajnil",    lastName: "Singh", role: "super_admin",   companyCode: "cdp001", passwordHash: CDP_DEMO_HASH },
  { id: "user-cdp-gm-001",  email: "george.singh@cdpcouriers.demo",  firstName: "George",    lastName: "Singh", role: "manager",       companyCode: "cdp001", passwordHash: CDP_DEMO_HASH },
  { id: "user-cdp-fin-001", email: "ashwin.ram@cdpcouriers.demo",    firstName: "Ashwin",    lastName: "Ram",   role: "finance_admin", companyCode: "cdp001", passwordHash: CDP_DEMO_HASH },
  { id: "user-cdp-arr-001", email: "rajneelta@cdpcouriers.demo",     firstName: "Rajneelta", lastName: null,    role: "coordinator",   companyCode: "cdp001", passwordHash: CDP_DEMO_HASH },
] as const;

/**
 * Ensure all 11 demo users required for /api/demo-login exist in the database.
 * Uses INSERT … ON CONFLICT DO NOTHING so existing rows are never overwritten
 * and the function is safe to call regardless of how many other users exist.
 * Runs in < 200ms (single batch insert of 11 rows).
 */
export async function ensureDemoUsers(): Promise<void> {
  const now = new Date("2025-01-01T00:00:00Z");

  // Always attempt the batch insert — ON CONFLICT DO NOTHING makes this safe
  // even when some or all demo users already exist.  We cannot rely on a total
  // user count because the DB may already hold non-demo users from Replit Auth
  // or previous sessions, causing a count-based early exit to skip required rows.
  const result = await db
    .insert(users)
    .values(
      DEMO_USERS.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName ?? null,
        profileImageUrl: null,
        role: u.role,
        companyCode: u.companyCode,
        passwordHash: u.passwordHash,
        isActive: true,
        lastLogin: null,
        createdAt: now,
        updatedAt: now,
      }))
    )
    .onConflictDoNothing()
    .returning({ id: users.id });

  if (result.length > 0) {
    console.log(`[dbInit] Inserted ${result.length} missing demo user(s).`);
  }
}
