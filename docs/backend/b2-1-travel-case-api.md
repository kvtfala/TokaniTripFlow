# B2.1 Travel Case API

## Scope

This increment implements the first production travel-case backend slice against the frontend baseline at commit `38a166a`.

Implemented endpoints:

- `GET /api/v1/travel-cases`
- `GET /api/v1/travel-cases/:caseId`
- `POST /api/v1/travel-cases`

Draft updates and initial service-component creation were added in B2.2. Later component lifecycle changes, review workflow transitions, and approvals remain intentionally outside that increment.

B2.3 adds the first formal submission transition. B2.4 adds coordinator review assignment, structured return-for-information, corrective resubmission, and safe component amendment. B2.5 adds policy evaluation, immutable review outcomes, staged approval requirements, delegated-authority checks, append-only approval decisions, and a least-privilege approver work queue. Authority to Proceed, provider coordination, and component fulfilment remain outside this increment.

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
- Requester ownership and coordinator assignment are stored separately so claiming a review never transfers ownership of the case.
- Only coordinator, travel-desk, and travel-admin memberships can claim reviews or request information; tenant administration remains separate from operational access.
- Information requests and responses are append-only, linked to the exact submission snapshot under review, and preserve the original submission.
- Returned cases can be corrected only by their requester and must be formally resubmitted with a response summary.
- Resubmission creates a new immutable snapshot and records material changes to traveller, dates, destination, funding, or required components.
- A database uniqueness constraint limits commercial charging to one formal submission event per case, including after corrective resubmission.
- Components are never hard-deleted after submission; they are amended or marked withdrawn with version and audit controls.
- Review completion freezes the exact submission snapshot and approval-policy version used to calculate the route.
- Approval decisions are append-only, stage-ordered, idempotent, and tied to authority evidence and the reviewed subject version.
- Self-approval is denied by default; delegation is time-bound, role-scoped, amount-aware, and evaluated again when a decision is recorded.
- `approved` does not mean a provider may act. The separate Authority to Proceed gate remains required before operational commitment.
- Approvers receive a scoped work queue rather than broad tenant-wide case access.

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
- `public.travel_case_review_assignments`
- `public.travel_case_information_requests`
- `public.travel_case_information_responses`
- `public.claim_travel_case_review(...)`
- `public.request_travel_case_information(...)`
- `public.complete_travel_case_review(...)`
- `public.record_approval_decision(...)`
- `public.list_pending_approval_work(...)`
- `public.organisation_approval_policies`
- `public.travel_case_review_outcomes`
- `public.approval_cycles`
- `public.approval_requirements`
- `public.approval_delegations`
- `public.approval_decisions`
- `public.update_service_component(...)`

Migration history:

- `20260902031803_b2_1_travel_case_security_foundation`
- `20260902031957_b2_1_travel_case_contract_alignment`
- `20260902034827_b2_2_draft_component_transactions`
- `20260902043033_b2_3_secure_submission_foundation`
- `20260902043130_b2_3_immutable_evidence_hardening`
- `20260902043401_b2_3_submission_advisor_hardening`
- `20260902044824_b2_4_coordinator_review_foundation`
- `20260902084156_b2_4_review_advisor_hardening`
- `20260902084414_b2_4_operational_role_separation`
- `20260902113000_b2_5_approval_policy_foundation`
- `20260902114500_b2_5_approval_index_hardening`
- `20260902115000_b2_5_requirement_case_index`
- `20260902120000_b2_5_approval_work_queue`

## Verification record

- Strict TypeScript check: passed.
- Automated tests: see the latest quality-gate run for the repository total.
- Production build: passed.
- Supabase security advisor: zero findings after migration.
- RLS: enabled and forced on all three tables.
- Direct `anon` and `authenticated` DML grants: none.
- Draft RPC execution: limited to PostgreSQL administration and `service_role`.
- Seeded travel cases, components, and events: zero.

The dependency audit has no high or critical findings. Ten moderate transitive findings remain in development tooling and `uuid` dependency paths; the available automated remediations require breaking downgrades, so they were not forced into this increment. The non-breaking high-severity `browserslist` remediation was applied immediately.

## Forward-build rule

All later travel-case endpoints must reuse the same request identity, strict contracts, organisation scoping, neutral not-found behavior, audit-event pattern, and migration-only database change process. No endpoint may accept a browser-provided organisation identifier as authorization evidence.

## Next increment

Build Authority to Proceed on top of a completed approval cycle. It must be explicit, scoped to provider/component/option version/amount, time-bounded, revocable or supersedable without rewriting history, and required before any provider instruction or commitment.
