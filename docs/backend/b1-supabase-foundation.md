# Backend Phase B1 Supabase foundation

Status: repository and remote security foundation implemented

Reviewed frontend baseline: `38a166ac55047f9c55899d05b67583394bb87ae4`

## Outcome

B1 establishes a reproducible, fail-closed Supabase development foundation.
The dedicated `TokaniTripFlow` project was verified healthy before the first
controlled migration. The unrelated `Quote My Job` project was not modified.

## Implemented controls

- Supabase CLI commands pin version `2.116.0` explicitly; contributors and CI
  use the same tooling version without adding a runtime dependency.
- Local Supabase ports, Auth behavior and storage limits are versioned in
  `supabase/config.toml`.
- Anonymous sign-in and open public sign-up are disabled by default.
- Local configuration is explicitly development-only and must not be exposed
  to external traffic.
- The seed file contains no user, personal, client or business information.
- Local CLI state, environment files and branch state are excluded from Git.
- `.env.example` separates browser-safe values from server-only secrets.
- Production startup fails when database, Supabase or cryptographic secrets
  are absent, placeholder values, reused or browser-exposed.
- The legacy hard-coded approval-token secret has been removed.
- Demonstration authentication is prohibited in production configuration.
- CI verifies the pinned Supabase CLI and production environment controls.
- The first remote migration removes anonymous and authenticated execution of
  the platform-provided `SECURITY DEFINER` RLS event-trigger function.
- A private application schema is inaccessible to browser database roles.
- Untrusted roles cannot create objects in the public schema.
- Supabase security and performance advisors report no findings after the
  migration.

## Environment separation

| Environment | Purpose | Data rule | Access rule |
| --- | --- | --- | --- |
| Local | developer implementation | fictional deterministic fixtures only | local machine; never internet-exposed |
| Test/preview | integration and acceptance | synthetic data only | CI and authorized reviewers |
| Production | client operations | approved client information | least privilege, MFA for privileged operators, audited changes |

No environment shares database credentials, cryptographic secrets, storage
objects or Auth users. Production data must not be copied into local or preview
environments.

## Remote completion evidence

- Project name: `TokaniTripFlow`.
- Project health: active and healthy.
- PostgreSQL: 17, general availability channel.
- Region: `ap-southeast-2` (Sydney).
- Public application tables: none before B2/B3.
- Applied migrations: `b1_security_foundation`.
- Anonymous execution of `public.rls_auto_enable()`: denied.
- Authenticated execution of `public.rls_auto_enable()`: denied.
- Anonymous/authenticated use of `app_private`: denied.
- Public creation in the `public` schema: denied.
- Security advisor: clear.
- Performance advisor: clear.

## Before B2

1. Record the project owner, environment and data classification.
2. Configure protected deployment secrets outside Git.
3. Confirm administrative MFA and recovery ownership.
4. Retain migration and advisor results as control evidence.

Production project creation is not combined with development setup. A
separate production-change approval is required before any production project,
credentials or data are introduced.

## B1 acceptance boundary

Repository and database foundation controls may be reviewed and merged. B2
authentication coding can begin after the region and administrative-account
controls are confirmed. No non-TripFlow Supabase project may be reused.
