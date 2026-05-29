import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  // DATABASE_URL is injected automatically by Replit's built-in PostgreSQL integration.
  // If missing, the database has not been provisioned — run `npm run db:push` after
  // provisioning the database in the Replit Database pane.
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Provision a PostgreSQL database in the Replit Database pane, then restart the server."
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export type Db = typeof db;
