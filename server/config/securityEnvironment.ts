import { z } from "zod";

const nonPlaceholderSecret = z.string().min(32).refine(
  (value) => !/replace-with|changeme|tokani-tripflow-secret/i.test(value),
  "A generated secret is required",
);

const productionSecurityEnvironmentSchema = z.object({
  NODE_ENV: z.literal("production"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  SESSION_SECRET: nonPlaceholderSecret,
  APPROVAL_TOKEN_SECRET: nonPlaceholderSecret,
  SUPABASE_URL: z.string().url().startsWith("https://"),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  PUBLIC_APP_URL: z.string().url().startsWith("https://"),
  AUTH_ALLOWED_ORIGINS: z.string().min(1).refine(
    (value) => value.split(",").every((origin) => {
      try { return new URL(origin.trim()).protocol === "https:"; } catch { return false; }
    }),
    "Every production allowed origin must be an HTTPS URL",
  ),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().startsWith("https://"),
  DEMO_AUTH_ENABLED: z.enum(["false", "0"]).default("false"),
  LEGACY_API_ENABLED: z.enum(["false", "0"]).default("false"),
}).superRefine((environment, context) => {
  if (environment.SESSION_SECRET === environment.APPROVAL_TOKEN_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["APPROVAL_TOKEN_SECRET"],
      message: "Approval and session secrets must be independent",
    });
  }
});

export function assertProductionSecurityEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  if (environment.NODE_ENV !== "production") return;
  productionSecurityEnvironmentSchema.parse(environment);

  for (const name of Object.keys(environment)) {
    if (name.startsWith("VITE_") && /(SECRET|SERVICE_ROLE|DATABASE_URL)/.test(name)) {
      throw new Error(`Server secret cannot use a browser-exposed prefix: ${name}`);
    }
  }
}

export function getApprovalTokenSecret(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return nonPlaceholderSecret.parse(environment.APPROVAL_TOKEN_SECRET);
}

export const PRIVILEGED_MFA_ROLES = ["coordinator", "approver", "manager", "finance_admin", "travel_admin", "super_admin"] as const;

export function isMfaRequiredForRole(role: string, environment: NodeJS.ProcessEnv = process.env): boolean {
  const configuredRoles = (environment.MFA_REQUIRED_ROLES ?? PRIVILEGED_MFA_ROLES.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configuredRoles.includes(role);
}
