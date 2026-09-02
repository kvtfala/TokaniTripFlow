# B2.1 Travel Case API

## Scope

This increment implements the first production travel-case backend slice against the frontend baseline at commit `38a166a`.

Implemented endpoints:

- `GET /api/v1/travel-cases`
- `GET /api/v1/travel-cases/:caseId`
- `POST /api/v1/travel-cases`

Draft updates and initial service-component creation were added in B2.2. Later component lifecycle changes, review workflow transitions, and approvals remain intentionally outside that increment.

B2.3 adds the first formal submission transition. Post-submission review, return-for-information, approval, authorisation, coordination, and component fulfilment remain outside this increment.

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
- Draft updates use optimistic version checks so two browser sessions cannot silently overwrite each other.
- Component creation requires an idempotency key, preventing duplicate services when a request is retried.
- Every write function verifies that the authenticated user, membership and organisation belong together, providing database-level defence against an application-layer scoping mistake.
- Users belonging to multiple organisations must explicitly select an organisation context; the server will not silently choose one.
- Ordinary users can list only cases they own or are travelling on. Designated case-management roles can access the organisation queue.
- Submission creates an immutable request-and-component snapshot, a status audit event, and one commercial usage event in the same transaction.
- Submission retries use an idempotency key and cannot create duplicate snapshots or billable events.
- Audit events and submission snapshots are protected from update and deletion by database triggers.
- The Supabase secret key remains server-side and is never included in frontend code.

These controls support the secure-development, identity, access-control, logging, and tenant-isolation objectives relevant to ISO/IEC 27001 and ISO/IEC 27002. They are implementation evidence, not a claim of ISO certification.

## Database objects

- `public.travel_cases`
- `public.service_components`
- `public.case_events`
- `public.create_travel_case_draft(...)`
- `public.update_travel_case_draft(...)`
- `public.add_service_component(...)`
- `public.submit_travel_case(...)`
- `public.travel_case_submission_snapshots`
- `public.commercial_usage_events`
- `public.organisation_submission_policies`

Migration history:

- `20260902031803_b2_1_travel_case_security_foundation`
- `20260902031957_b2_1_travel_case_contract_alignment`
- `20260902034827_b2_2_draft_component_transactions`
- `20260902043033_b2_3_secure_submission_foundation`
- `20260902043130_b2_3_immutable_evidence_hardening`
- `20260902043401_b2_3_submission_advisor_hardening`

## Verification record

- Strict TypeScript check: passed.
- Automated tests: 62 passed across 16 files.
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

Define and implement coordinator review, return-for-information, and component update/removal rules. Return-for-information must preserve every submission snapshot, while later material changes must create new versions and trigger revalidation rather than rewriting the original submission.
