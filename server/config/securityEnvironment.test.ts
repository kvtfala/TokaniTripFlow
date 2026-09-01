import { describe, expect, it } from "vitest";
import {
  assertProductionSecurityEnvironment,
  getApprovalTokenSecret,
} from "./securityEnvironment";

const secureProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://tripflow:secret@database.example.com:5432/tripflow",
  SESSION_SECRET: "session-secret-0000000000000000000000000001",
  APPROVAL_TOKEN_SECRET: "approval-secret-0000000000000000000000001",
  SUPABASE_URL: "https://tripflow.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example_key_value",
  SUPABASE_SECRET_KEY: "sb_secret_example_key_value_server_only",
  PUBLIC_APP_URL: "https://tripflow.example.com",
  AUTH_ALLOWED_ORIGINS: "https://tripflow.example.com",
  PASSWORD_RESET_REDIRECT_URL: "https://tripflow.example.com/reset-password",
  DEMO_AUTH_ENABLED: "false",
};

describe("production security environment", () => {
  it("accepts separated server secrets and disabled demo auth", () => {
    expect(() => assertProductionSecurityEnvironment(secureProductionEnvironment)).not.toThrow();
  });

  it("fails closed when production secrets are absent", () => {
    expect(() => assertProductionSecurityEnvironment({ NODE_ENV: "production" })).toThrow();
  });

  it("rejects shared cryptographic secrets", () => {
    expect(() => assertProductionSecurityEnvironment({
      ...secureProductionEnvironment,
      APPROVAL_TOKEN_SECRET: secureProductionEnvironment.SESSION_SECRET,
    })).toThrow(/independent/);
  });

  it("rejects server secrets exposed through Vite", () => {
    expect(() => assertProductionSecurityEnvironment({
      ...secureProductionEnvironment,
      VITE_SUPABASE_SECRET_KEY: "must-not-be-public",
    })).toThrow(/browser-exposed/);
  });

  it("does not permit the legacy approval-token fallback", () => {
    expect(() => getApprovalTokenSecret({
      APPROVAL_TOKEN_SECRET: "tokani-tripflow-secret-2025",
    })).toThrow();
  });
});
