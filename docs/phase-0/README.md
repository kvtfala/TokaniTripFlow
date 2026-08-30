# Phase 0: Production foundations

Phase 0 converts the current TripFlow demonstration into a controlled base for
production development. It does not add broad end-user functionality. Its job
is to make the product model, tenant boundary, lifecycle, security controls and
migration path explicit before feature work expands.

## Approved direction

- A travel case is the universal coordination record.
- A case contains one or more independently managed service components.
- An organisation ID is the authoritative tenant boundary. `companyCode`
  remains a temporary compatibility alias while existing data is migrated.
- The case lifecycle is separate from approval, authority-to-proceed, payment,
  provider-confirmation and fulfilment states.
- Material events and document versions are append-only or superseded; they
  are not silently overwritten.
- The existing application will be evolved using expand, migrate and contract
  changes rather than replaced in a big-bang rewrite.

## Work packages

| ID | Work package | Exit condition |
| --- | --- | --- |
| P0.1 | Architecture blueprint | Architecture direction and decision register approved |
| P0.2 | Repository baseline | Build, type-check, dependency and runtime gaps recorded |
| P0.3 | Target schema | Tenant-owned entities, keys and constraints peer-reviewed |
| P0.4 | Lifecycle contract | Commands, transitions and invariants are testable |
| P0.5 | Authorisation model | Role and classification permissions are explicit |
| P0.6 | Audit and documents | Evidence, versioning and retention rules are defined |
| P0.7 | Migration plan | Existing demo data maps to the target model and reconciles |
| P0.8 | Security gates | Automated tenant and permission tests run in CI |
| P0.9 | Vertical-slice backlog | First end-to-end implementation slice is approved |

## Implementation order

1. Stabilise the existing type-check and build baseline.
2. Add organisations and memberships without removing `companyCode`.
3. Add travel cases and service components alongside `travel_requests`.
4. Introduce explicit lifecycle commands and append-only case events.
5. Migrate and reconcile demo data.
6. Move reads and writes behind feature flags.
7. Remove compatibility fields only after verification and rollback review.

Production feature work must not bypass these foundations.

