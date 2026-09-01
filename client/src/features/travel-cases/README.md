# Phase 1 travel-case frontend

This feature is the production integration surface for the approved TripFlow
case UX. It consumes only the schemas and routes in
`shared/contracts/travelCases.ts`.

## Boundaries

- The tenant is resolved by authenticated membership and is never submitted by
  the browser as authoritative data.
- API responses are validated at runtime before entering the UI.
- Cross-tenant and absent resources share the same not-found behaviour.
- The feature is isolated from legacy `/api/requests` screens while the
  vertical slice is migrated.
- The production route remains feature-flagged until the Phase 1 API and
  tenant-isolation tests are complete.

## Structure

- `api/`: contract-validating HTTP boundary
- `hooks/`: query orchestration and cache ownership
- `components/`: accessible, data-independent views
- `pages/`: route adapters only
