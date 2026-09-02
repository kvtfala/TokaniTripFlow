# B2.1 Travel Case API

## Scope

This increment implements the first production travel-case backend slice against the frontend baseline at commit `38a166a`.

Implemented endpoints:

- `GET /api/v1/travel-cases`
- `GET /api/v1/travel-cases/:caseId`
- `POST /api/v1/travel-cases`

Updates, service-component changes, submission, workflow transitions, and approvals remain intentionally outside this increment.

## Security design

- Supabase authentication establishes the request identity.
- Organisation, membership, and role are derived on the server. Client-supplied organisation overrides are rejected.
- Every request requires an active organisation membership.
- Every database query includes the server-derived organisation identifier.
- Cross-organisation and unknown identifiers return the same neutral not-found response.
- Request bodies are validated with strict shared Zod contracts.
- Browser roles have no direct DML grants on the travel-case tables.
- Row-level security is enabled and forced on travel cases, service components, and case events.
- Draft creation and its audit event are committed atomically by a server-only database function.
- The Supabase secret key remains server-side and is never included in frontend code.

These controls support the secure-development, identity, access-control, logging, and tenant-isolation objectives relevant to ISO/IEC 27001 and ISO/IEC 27002. They are implementation evidence, not a claim of ISO certification.

## Database objects

- `public.travel_cases`
- `public.service_components`
- `public.case_events`
- `public.create_travel_case_draft(...)`

Migration history:

- `20260902031803_b2_1_travel_case_security_foundation`
- `20260902031957_b2_1_travel_case_contract_alignment`

## Verification record

- Strict TypeScript check: passed.
- Automated tests: 53 passed across 15 files.
- Production build: passed.
- Supabase security advisor: zero findings after migration.
- RLS: enabled and forced on all three tables.
- Direct `anon` and `authenticated` DML grants: none.
- Draft RPC execution: limited to PostgreSQL administration and `service_role`.
- Seeded travel cases, components, and events: zero.

The dependency audit reports six moderate findings in transitive `uuid` dependencies. The available automated remediation requires a breaking `exceljs` downgrade, so it was not applied in this increment. This remains a tracked dependency-maintenance item and does not expose the new database authorization path.

## Forward-build rule

All later travel-case endpoints must reuse the same request identity, strict contracts, organisation scoping, neutral not-found behavior, audit-event pattern, and migration-only database change process. No endpoint may accept a browser-provided organisation identifier as authorization evidence.

## Next increment

Implement authenticated draft updates and service-component management, then add workflow submission as a separate atomic transition. Each endpoint must ship with tenant-isolation, role, validation, audit, and negative-path tests before the phase advances.
