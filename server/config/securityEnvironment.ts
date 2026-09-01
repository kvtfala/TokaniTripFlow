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
  DEMO_AUTH_ENABLED: z.enum(["false", "0"]).default("false"),
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
