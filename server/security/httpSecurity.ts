import type { Express, Request, RequestHandler } from "express";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isDemoAuthEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.NODE_ENV !== "production" && ["1", "true"].includes(environment.DEMO_AUTH_ENABLED ?? "");
}

function requestOriginAllowed(request: Request, allowedOrigins: string[]): boolean {
  const fetchSite = request.header("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  const origin = request.header("origin");
  if (!origin) return true;
  if (allowedOrigins.length > 0) return allowedOrigins.includes(origin);
  const host = request.header("host");
  return Boolean(host && origin === `${request.protocol}://${host}`);
}

export function apiOriginProtection(environment: NodeJS.ProcessEnv = process.env): RequestHandler {
  const allowedOrigins = (environment.AUTH_ALLOWED_ORIGINS ?? environment.PUBLIC_APP_URL ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return (request, response, next) => {
    if (!request.path.startsWith("/api") || !UNSAFE_METHODS.has(request.method)) return next();
    if (requestOriginAllowed(request, allowedOrigins)) return next();
    return response.status(403).json({ error: { code: "forbidden", message: "Request origin is not allowed" } });
  };
}

interface RateLimitOptions {
  windowMs: number;
  limit: number;
  paths: string[];
}

export function inMemoryRateLimit(options: RateLimitOptions): RequestHandler {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return (request, response, next) => {
    if (!options.paths.some((path) => request.path === path || request.path.startsWith(`${path}/`))) return next();
    const now = Date.now();
    if (attempts.size > 10_000) {
      for (const [storedKey, stored] of attempts) if (stored.resetAt <= now) attempts.delete(storedKey);
    }
    const key = `${request.ip}:${request.path}`;
    const current = attempts.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    attempts.set(key, entry);
    response.set("RateLimit-Limit", String(options.limit));
    response.set("RateLimit-Remaining", String(Math.max(0, options.limit - entry.count)));
    response.set("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count <= options.limit) return next();
    response.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return response.status(429).json({ error: { code: "rate_limited", message: "Too many requests" } });
  };
}

export function registerHttpSecurity(app: Express): void {
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    });
    if (process.env.NODE_ENV === "production") {
      response.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  app.use(apiOriginProtection());
  app.use(inMemoryRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    paths: ["/api/v1/auth/sign-in", "/api/v1/auth/password-reset", "/api/demo-login", "/api/token-approve"],
  }));
}
