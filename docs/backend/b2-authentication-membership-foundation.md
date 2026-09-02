# Backend Phase B2 authentication and membership foundation

Status: database foundation and server-managed application sign-in boundary implemented

Project: `TokaniTripFlow`, Sydney (`ap-southeast-2`)

## B2.1 security consolidation gate

- Production can no longer register demo login, demo logout or Passport session
  authentication, even if a demo flag is accidentally set.
- Known demo identities are removed at startup whenever explicit non-production
  demo mode is disabled; they are seeded only in explicit development demo mode.
- Supabase sessions are resolved into one server-authoritative request identity
  sourced from active RLS-protected organisation membership.
- Legacy protected endpoints now fail closed for Supabase identities until each
  endpoint is migrated to membership-based tenant authorization. This prevents
  the old `companyCode` model from silently becoming a cross-tenant bypass.
- Authentication, password recovery and approval-token routes have rate limits;
  unsafe API requests reject cross-site browser origins.
- Baseline CSP, anti-framing, MIME-sniffing, referrer, permissions and HSTS
  headers are applied centrally.
- API response bodies and raw server exception details are no longer written to
  operational logs or returned for unexpected production errors.

## Implemented

- Password sign-in, server-validated sessions, refresh, sign-out and password
  reset initiation are implemented behind `VITE_AUTH_MODE=supabase`.
- Access and refresh tokens are kept in `HttpOnly`, `SameSite=Lax` cookies;
  production cookies are also `Secure` and use the `__Host-` prefix.
- Every authentication response is `private, no-store`; the browser receives
  only a safe identity/membership projection resolved under Supabase RLS.
- Mutating authentication routes enforce an allowed same-origin boundary.

- `auth.users` remains the authoritative identity store managed by Supabase.
- `user_profiles` contains non-authoritative display preferences only.
- `organisations` represents isolated TripFlow tenants.
- `organisation_memberships` links a user to a tenant with a controlled role
  and lifecycle status.
- `organisation_invitations` stores only SHA-256 token hashes, expiry and
  server-managed acceptance facts; raw invitation tokens are never stored.
- `identity_audit_events` is a server-managed, append-only evidence target.
- Creating an Auth user automatically creates a minimal profile without using
  editable metadata for authorization.
- An active-membership helper permits tenant visibility without recursive RLS.
- All five public tables have RLS enabled and forced.
- Anonymous roles have no DML access.
- Authenticated users can read/update only their own profile fields, read only
  their own memberships and see only organisations where they are active.
- Invitations and identity audit records have explicit deny-client policies
  and no client table grants.
- Foreign-key and RLS predicate indexes are present before operational data.
- Direct Drizzle schema push is blocked; reviewed Supabase migrations are the
  only approved production schema-change path.

## Security boundaries

- Browser role, organisation and membership claims are not authoritative.
- `raw_user_meta_data` may supply an initial display name but never a role,
  tenant or capability.
- Organisation and invitation creation remain server-only.
- No real organisation, user, invitation or client data was seeded.
- No public signup or anonymous authentication was enabled.
- The service/secret key remains server-only and outside Git.

## Verification evidence

- Supabase security advisor: no findings.
- Missing foreign-key index findings: resolved.
- Remaining performance notices are expected unused-index notices because all
  B2 tables contain zero rows and have not yet served traffic.
- RLS is enabled and forced on every B2 public table.
- Anonymous DML privileges are absent on every B2 table.
- Authenticated insert/delete privileges are absent on every B2 table.
- Profile trigger exists on `auth.users`.
- Remote migration history and repository migration files match.

## Remaining B2 implementation

1. Add password-reset completion UI and validate the full email recovery flow.
2. Implement server-managed organisation creation and invitation acceptance.
3. Require MFA for privileged roles before pilot production access.
4. Test two users across two organisations, suspended membership, expired
   invitation, revoked session and cross-tenant access attempts.

Application authentication must not be enabled for pilot users until these
remaining controls and end-to-end tests pass.
