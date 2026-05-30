/**
 * server/dbInit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Startup-safe idempotent initializer for DbStorage.
 *
 * Called once at server boot BEFORE any routes are registered.
 * 1. Purges any remaining cdp001 demo data (safe – idempotent DELETE).
 * 2. Ensures the demo users required for /api/demo-login exist in the database
 *    so that demo credentials work on a fresh database environment without
 *    requiring a manual seed script run.
 *
 * Safe to call multiple times — uses ON CONFLICT DO NOTHING for inserts.
 */

import { db } from "./db";
import { users, travelRequests, expenseClaims, refSequences } from "@shared/schema";
import { eq } from "drizzle-orm";

// All demo orgs share one password: itt1235*
// Hash generated with bcrypt cost 10.
const DEMO_HASH = "$2b$10$btwIziGooE5YvHpoZJxjjeYgqya3zJPk2EWmSmW.p2/Ck6r64rUGS";

const DEMO_USERS = [
  // ── Island Travel Technologies (itt001) ──────────────────────────────────
  { id: "user-itt-manager-001",     email: "desmond.bale@islandtraveltech.com",     firstName: "Desmond",  lastName: "Bale",       role: "super_admin",   companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-employee-001",    email: "jone.ratudina@islandtraveltech.com",    firstName: "Jone",     lastName: "Ratudina",   role: "employee",      companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-coordinator-001", email: "litia.vuniyayawa@islandtraveltech.com", firstName: "Litia",    lastName: "Vuniyayawa", role: "coordinator",   companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-manager-002",     email: "tomasi.ravouvou@islandtraveltech.com",  firstName: "Tomasi",   lastName: "Ravouvou",   role: "manager",       companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-finance-001",     email: "mere.delana@islandtraveltech.com",      firstName: "Mere",     lastName: "Delana",     role: "finance_admin", companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-travel-001",      email: "nemani.tui@islandtraveltech.com",       firstName: "Nemani",   lastName: "Tui",        role: "travel_admin",  companyCode: "itt001", passwordHash: DEMO_HASH },
  // ── Tuvalu High Commission (thc001) ──────────────────────────────────────
  { id: "user-thc-employee-001",    email: "peni.taufa@tuvaluhighcomm.demo",        firstName: "Peni",     lastName: "Taufa",      role: "employee",      companyCode: "thc001", passwordHash: DEMO_HASH },
  { id: "user-thc-manager-001",     email: "semisi.pio@tuvaluhighcomm.demo",        firstName: "Semisi",   lastName: "Pio",        role: "manager",       companyCode: "thc001", passwordHash: DEMO_HASH },
  // ── Kiribati High Commission (khc001) ────────────────────────────────────
  { id: "user-khc-employee-001",    email: "tearia.tabai@kiribatihighcomm.demo",    firstName: "Tearia",   lastName: "Tabai",      role: "employee",      companyCode: "khc001", passwordHash: DEMO_HASH },
  { id: "user-khc-manager-001",     email: "bwere.ieang@kiribatihighcomm.demo",     firstName: "Bwere",    lastName: "Ieang",      role: "manager",       companyCode: "khc001", passwordHash: DEMO_HASH },
] as const;

/**
 * Removes all cdp001 demo data that may still exist from a previous seed run.
 * Safe and idempotent — does nothing if no cdp001 rows exist.
 * Scoped strictly to company_code = 'cdp001'.
 */
async function purgeCdpDemoData(): Promise<void> {
  await db.delete(expenseClaims).where(eq(expenseClaims.companyCode, "cdp001"));
  await db.delete(travelRequests).where(eq(travelRequests.companyCode, "cdp001"));
  await db.delete(refSequences).where(eq(refSequences.companyCode, "cdp001"));
  await db.delete(users).where(eq(users.companyCode, "cdp001"));
}

/**
 * Ensure all demo users required for /api/demo-login exist in the database.
 * Uses INSERT … ON CONFLICT DO NOTHING so existing rows are never overwritten
 * and the function is safe to call regardless of how many other users exist.
 */
async function ensureDemoUsers(): Promise<void> {
  const now = new Date("2025-01-01T00:00:00Z");

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

export async function initializeDatabase(): Promise<void> {
  await purgeCdpDemoData();
  await ensureDemoUsers();
}
