import { randomUUID } from "node:crypto";
import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { isMfaRequiredForRole } from "../config/securityEnvironment";

const signInSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(1024),
}).strict();

const passwordResetSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
}).strict();

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  user: z.object({ id: z.string().uuid(), email: z.string().email().nullable().optional() }).passthrough(),
}).passthrough();

const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
}).passthrough();

type Fetch = typeof globalThis.fetch;

export interface SupabaseAuthConfig {
  url: string;
  publishableKey: string;
  production: boolean;
  allowedOrigins: string[];
}

export interface TripFlowRequestIdentity {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  companyCode: string | null;
  isActive: boolean;
  memberships: Array<Record<string, unknown>>;
  authenticatorAssuranceLevel: "aal1" | "aal2";
  mfaRequired: boolean;
  mfaVerified: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    tripflowIdentity?: TripFlowRequestIdentity;
  }
}

export function readSupabaseAuthConfig(environment: NodeJS.ProcessEnv = process.env): SupabaseAuthConfig | null {
  const url = environment.SUPABASE_URL;
  const publishableKey = environment.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  return {
    url: new URL(url).origin,
    publishableKey,
    production: environment.NODE_ENV === "production",
    allowedOrigins: (environment.AUTH_ALLOWED_ORIGINS ?? environment.PUBLIC_APP_URL ?? "")
      .split(",").map((value) => value.trim()).filter(Boolean),
  };
}

function cookieNames(production: boolean) {
  return production
    ? { access: "__Host-tripflow_access", refresh: "__Host-tripflow_refresh" }
    : { access: "tripflow_access", refresh: "tripflow_refresh" };
}

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

function setSessionCookies(response: Response, config: SupabaseAuthConfig, session: z.infer<typeof tokenResponseSchema>) {
  const names = cookieNames(config.production);
  const common = { httpOnly: true, secure: config.production, sameSite: "lax" as const, path: "/" };
  response.cookie(names.access, session.access_token, { ...common, maxAge: session.expires_in * 1000 });
  response.cookie(names.refresh, session.refresh_token, { ...common, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function clearSessionCookies(response: Response, config: SupabaseAuthConfig) {
  const names = cookieNames(config.production);
  const options = { httpOnly: true, secure: config.production, sameSite: "lax" as const, path: "/" };
  response.clearCookie(names.access, options);
  response.clearCookie(names.refresh, options);
}

function noStore(response: Response) {
  response.set("Cache-Control", "private, no-store");
  response.set("Pragma", "no-cache");
  response.set("Vary", "Cookie");
}

function correlationId(request: Request): string {
  const supplied = request.header("x-correlation-id");
  return supplied && /^[A-Za-z0-9._:-]{8,128}$/.test(supplied) ? supplied : randomUUID();
}

function apiError(request: Request, response: Response, status: number, code: string, message: string) {
  return response.status(status).json({ error: { code, message, correlationId: correlationId(request) } });
}

function originAllowed(request: Request, config: SupabaseAuthConfig): boolean {
  const origin = request.header("origin");
  if (!origin) return true;
  if (config.allowedOrigins.length > 0) return config.allowedOrigins.includes(origin);
  const host = request.header("host");
  if (!host) return false;
  return origin === `${request.protocol}://${host}`;
}

async function authRequest(fetchImpl: Fetch, config: SupabaseAuthConfig, path: string, init: RequestInit) {
  return fetchImpl(`${config.url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

function assuranceLevel(accessToken: string): "aal1" | "aal2" {
  try {
    const encoded = accessToken.split(".")[1];
    if (!encoded) return "aal1";
    const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { aal?: unknown };
    return claims.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

async function safeIdentity(fetchImpl: Fetch, config: SupabaseAuthConfig, accessToken: string): Promise<TripFlowRequestIdentity | null> {
  const userResponse = await authRequest(fetchImpl, config, "/user", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) return null;
  const user = authUserSchema.parse(await userResponse.json());

  const profileUrl = new URL(`${config.url}/rest/v1/user_profiles`);
  profileUrl.searchParams.set("select", "user_id,display_name,time_zone,locale");
  profileUrl.searchParams.set("user_id", `eq.${user.id}`);
  const membershipUrl = new URL(`${config.url}/rest/v1/organisation_memberships`);
  membershipUrl.searchParams.set("select", "id,organisation_id,user_id,role,status,activated_at");
  membershipUrl.searchParams.set("user_id", `eq.${user.id}`);
  membershipUrl.searchParams.set("status", "eq.active");
  const headers = { apikey: config.publishableKey, Authorization: `Bearer ${accessToken}` };
  const [profileResponse, membershipResponse] = await Promise.all([
    fetchImpl(profileUrl, { headers }), fetchImpl(membershipUrl, { headers }),
  ]);
  if (!profileResponse.ok || !membershipResponse.ok) throw new Error("Identity context unavailable");
  const [profile] = await profileResponse.json() as Array<Record<string, unknown>>;
  const memberships = await membershipResponse.json() as Array<Record<string, unknown>>;
  const primary = memberships[0];
  const role = typeof primary?.role === "string" ? primary.role : "employee";
  const aal = assuranceLevel(accessToken);
  const names = typeof profile?.display_name === "string" ? profile.display_name.trim().split(/\s+/, 2) : [];

  return {
    id: user.id,
    email: user.email ?? null,
    firstName: names[0] ?? null,
    lastName: names[1] ?? null,
    profileImageUrl: null,
    role,
    companyCode: typeof primary?.organisation_id === "string" ? primary.organisation_id : null,
    isActive: Boolean(primary),
    memberships: memberships.map((membership) => ({
      id: membership.id,
      organisationId: membership.organisation_id,
      userId: membership.user_id,
      role: membership.role,
      status: membership.status,
      activatedAt: membership.activated_at,
    })),
    authenticatorAssuranceLevel: aal,
    mfaRequired: isMfaRequiredForRole(role),
    mfaVerified: aal === "aal2",
  };
}

async function identityFromCookies(
  request: Request,
  response: Response,
  config: SupabaseAuthConfig,
  fetchImpl: Fetch,
): Promise<TripFlowRequestIdentity | null> {
  const names = cookieNames(config.production);
  const accessToken = cookieValue(request, names.access);
  const refreshToken = cookieValue(request, names.refresh);
  let identity = accessToken ? await safeIdentity(fetchImpl, config, accessToken) : null;
  if (identity || !refreshToken) return identity;
  const upstream = await authRequest(fetchImpl, config, "/token?grant_type=refresh_token", {
    method: "POST", body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!upstream.ok) {
    clearSessionCookies(response, config);
    return null;
  }
  const session = tokenResponseSchema.parse(await upstream.json());
  setSessionCookies(response, config, session);
  identity = await safeIdentity(fetchImpl, config, session.access_token);
  return identity;
}

export function createSupabaseIdentityMiddleware(
  config: SupabaseAuthConfig,
  fetchImpl: Fetch = globalThis.fetch,
): RequestHandler {
  return async (request, response, next) => {
    if (!request.path.startsWith("/api") || request.path.startsWith("/api/v1/auth/")) return next();
    const names = cookieNames(config.production);
    if (!cookieValue(request, names.access) && !cookieValue(request, names.refresh)) return next();
    try {
      const identity = await identityFromCookies(request, response, config, fetchImpl);
      if (identity?.isActive) request.tripflowIdentity = identity;
      else clearSessionCookies(response, config);
      return next();
    } catch {
      clearSessionCookies(response, config);
      return response.status(503).json({ error: { code: "service_unavailable", message: "Authentication service unavailable", correlationId: correlationId(request) } });
    }
  };
}

export function registerSupabaseAuthRoutes(app: Express, config: SupabaseAuthConfig, fetchImpl: Fetch = globalThis.fetch) {
  app.use("/api/v1/auth", (_request, response, next) => { noStore(response); next(); });

  app.post("/api/v1/auth/sign-in", async (request, response) => {
    if (!originAllowed(request, config)) return apiError(request, response, 403, "forbidden", "Request origin is not allowed");
    const parsed = signInSchema.safeParse(request.body);
    if (!parsed.success) return apiError(request, response, 400, "validation_failed", "Invalid sign-in request");
    try {
      const upstream = await authRequest(fetchImpl, config, "/token?grant_type=password", {
        method: "POST", body: JSON.stringify(parsed.data),
      });
      if (!upstream.ok) return apiError(request, response, 401, "unauthenticated", "Email or password is incorrect");
      const session = tokenResponseSchema.parse(await upstream.json());
      setSessionCookies(response, config, session);
      const identity = await safeIdentity(fetchImpl, config, session.access_token);
      if (!identity?.isActive) {
        clearSessionCookies(response, config);
        return apiError(request, response, 403, "forbidden", "No active TripFlow membership");
      }
      return response.status(200).json(identity);
    } catch {
      clearSessionCookies(response, config);
      return apiError(request, response, 503, "service_unavailable", "Authentication service unavailable");
    }
  });

  app.get("/api/v1/auth/session", async (request, response) => {
    const names = cookieNames(config.production);
    let accessToken = cookieValue(request, names.access);
    const refreshToken = cookieValue(request, names.refresh);
    try {
      let identity = accessToken ? await safeIdentity(fetchImpl, config, accessToken) : null;
      if (!identity && refreshToken) {
        const upstream = await authRequest(fetchImpl, config, "/token?grant_type=refresh_token", {
          method: "POST", body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (upstream.ok) {
          const session = tokenResponseSchema.parse(await upstream.json());
          setSessionCookies(response, config, session);
          accessToken = session.access_token;
          identity = await safeIdentity(fetchImpl, config, accessToken);
        }
      }
      if (!identity?.isActive) {
        clearSessionCookies(response, config);
        return apiError(request, response, 401, "unauthenticated", "Authentication required");
      }
      return response.json(identity);
    } catch {
      return apiError(request, response, 503, "service_unavailable", "Authentication service unavailable");
    }
  });

  app.post("/api/v1/auth/sign-out", async (request, response) => {
    if (!originAllowed(request, config)) return apiError(request, response, 403, "forbidden", "Request origin is not allowed");
    const names = cookieNames(config.production);
    const accessToken = cookieValue(request, names.access);
    try {
      if (accessToken) await authRequest(fetchImpl, config, "/logout", {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
      });
    } finally {
      clearSessionCookies(response, config);
    }
    return response.status(204).send();
  });

  app.post("/api/v1/auth/password-reset", async (request, response) => {
    if (!originAllowed(request, config)) return apiError(request, response, 403, "forbidden", "Request origin is not allowed");
    const parsed = passwordResetSchema.safeParse(request.body);
    if (!parsed.success) return apiError(request, response, 400, "validation_failed", "Invalid password-reset request");
    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL;
    try {
      await authRequest(fetchImpl, config, "/recover", {
        method: "POST", body: JSON.stringify({ email: parsed.data.email, ...(redirectTo ? { redirect_to: redirectTo } : {}) }),
      });
    } catch { /* Keep the response generic to prevent account enumeration. */ }
    return response.status(202).json({ accepted: true });
  });
}
