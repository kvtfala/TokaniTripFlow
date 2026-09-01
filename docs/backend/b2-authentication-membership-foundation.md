# Backend Phase B2 authentication and membership foundation

Status: database foundation implemented; application sign-in integration pending

Project: `TokaniTripFlow`, Sydney (`ap-southeast-2`)

## Implemented

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

1. Add the pinned Supabase JavaScript client and server verification adapter.
2. Implement sign-in, sign-out, session refresh and password reset UI.
3. Replace production use of demo/Replit authentication behind a feature flag.
4. Implement server-managed organisation creation and invitation acceptance.
5. Require MFA for privileged roles before pilot production access.
6. Test two users across two organisations, suspended membership, expired
   invitation, revoked session and cross-tenant access attempts.

Application authentication must not be enabled for pilot users until these
remaining controls and end-to-end tests pass.
