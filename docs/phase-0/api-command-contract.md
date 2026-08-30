# API command contract

Phase 0 defines commands before exposing routes. Every production-core command
must resolve an authenticated user to an active organisation membership, take
the organisation ID from that server-side context, validate a request schema,
enforce the permission matrix, enforce the current-state invariant and append a
material event in the same database operation.

Clients may never supply an authoritative organisation ID or freely patch a
case status. Duplicate submissions require an idempotency key. A missing record
and a cross-tenant record return the same not-found response to prevent tenant
discovery. Conflicts return a version/state conflict rather than overwriting a
newer decision.

Initial commands are `CreateTravelCase`, `SubmitTravelCase`, `RecordApproval`,
`IssueAuthorityToProceed`, `AddServiceComponent`, `TransitionServiceComponent`,
`AddDocumentVersion` and `CloseTravelCase`.

