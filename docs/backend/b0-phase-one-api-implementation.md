# B0 Phase 1 backend API implementation specification

Source baseline: `38a166ac55047f9c55899d05b67583394bb87ae4`

This specification is the build contract for B1-B3. The Express API is the
application authorization boundary; Supabase Auth establishes identity and
PostgreSQL constraints plus RLS provide database enforcement.

## Common request pipeline

Every route executes these controls in order:

1. assign or validate a correlation ID;
2. validate the Supabase access token server-side;
3. resolve active organisation membership from authoritative data;
4. apply rate limits appropriate to query or command traffic;
5. validate path, query and body with the shared Zod schema;
6. evaluate stable capability, case scope, delegation and classification;
7. execute one tenant-scoped transaction;
8. append the defined audit event for commands; and
9. return a validated response or standard error envelope.

The browser never submits an authoritative organisation, role or approval
power. A service-role key never reaches the browser. User-editable Auth
metadata is not an authorization source.

## Six-route implementation contract

| Route | Authorization | Transaction and result | Failure rules |
| --- | --- | --- | --- |
| `GET /api/v1/travel-cases` | active membership + `case:read` | tenant-scoped, paginated summaries; stable sort; response contract validation | no cross-tenant counts; invalid cursor is `validation_failed` |
| `POST /api/v1/travel-cases` | active membership + `case:create` | create draft, allocate reference, version 0 and `case.draft_created`; return detail | reject tenant/role fields; optional idempotency receipt |
| `GET /api/v1/travel-cases/:caseId` | `case:read` + case scope | tenant-scoped case, children and server-derived available actions | absent and inaccessible are identical `not_found` |
| `PATCH /api/v1/travel-cases/:caseId/draft` | `case:edit` + case scope | update only draft fields where version matches; increment version; append `case.draft_updated` | stale version is `conflict`; non-draft is `conflict` |
| `POST /api/v1/travel-cases/:caseId/components` | `component:create` + case scope | reserve idempotency key, insert component, increment version and append `case.component_added` atomically | same key/body replays result; same key/different body is `conflict` |
| `POST /api/v1/travel-cases/:caseId/submission` | `case:submit` + case scope | validate completeness and tenant policy, reserve key, transition, increment version and append `case.submitted` atomically | missing facts are `validation_failed`; stale state/version is `conflict` |

## Persistence requirements

- Idempotency uniqueness is scoped by organisation, actor, command and key.
- Receipts store a canonical request hash, status and response reference.
- A pending receipt cannot be treated as a successful replay.
- Case writes use expected version in the database predicate.
- Audit events are append-only and include organisation, case, actor,
  correlation ID, event type, timestamp and safe structured details.
- Logs exclude access tokens, secrets, unrestricted document contents and
  unnecessary personal data.

## Supabase handoff rules

- Enable RLS on every exposed table before granting Data API access.
- Policies use `TO authenticated` plus tenant/membership predicates; the role
  alone is not authorization.
- Update policies have both `USING` and `WITH CHECK`, and the necessary select
  policy.
- Views exposed to clients use `security_invoker = true`.
- Privileged functions remain in an unexposed schema with revoked public
  execution, explicit search paths and their own identity checks.
- B1 pins client/CLI dependencies and commits the lockfile and migrations.

## Required verification in B3

Contract, integration and database tests must cover each success path plus
unauthenticated, forbidden, cross-tenant, stale-version, duplicate-command,
validation and unexpected-error cases. A two-tenant test fixture must prove
that list, detail, updates and child inserts cannot cross the boundary.
