# Backend Phase B1 Supabase foundation

Status: repository foundation implemented; remote project linking pending

Reviewed frontend baseline: `38a166ac55047f9c55899d05b67583394bb87ae4`

## Outcome

B1 establishes a reproducible, fail-closed Supabase development foundation
without changing a live database. The connected Supabase account currently has
no TripFlow project, so the unrelated project was not accessed or modified.

## Implemented controls

- Supabase CLI is pinned exactly in `package-lock.json`; contributors and CI
  use the same tooling version.
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

## Environment separation

| Environment | Purpose | Data rule | Access rule |
| --- | --- | --- | --- |
| Local | developer implementation | fictional deterministic fixtures only | local machine; never internet-exposed |
| Test/preview | integration and acceptance | synthetic data only | CI and authorized reviewers |
| Production | client operations | approved client information | least privilege, MFA for privileged operators, audited changes |

No environment shares database credentials, cryptographic secrets, storage
objects or Auth users. Production data must not be copied into local or preview
environments.

## Required remote completion

When a dedicated TripFlow Supabase project is approved:

1. create or select a TripFlow development project in an approved region;
2. record the project owner, environment and data classification;
3. link the CLI using a secret stored outside Git;
4. inspect the remote project before pulling or applying any schema;
5. run database and security advisors;
6. create the first migration with `supabase migration new`;
7. verify a clean local reset and migration list;
8. configure protected CI secrets; and
9. retain screenshots/logs as B1 control evidence.

Production project creation is not combined with development setup. A
separate production-change approval is required before any production project,
credentials or data are introduced.

## B1 acceptance boundary

Repository controls may be reviewed and merged now. B2 authentication coding
can begin against the local contract, but remote integration testing remains
blocked until a dedicated TripFlow development project exists. No existing
non-TripFlow Supabase project may be reused.
