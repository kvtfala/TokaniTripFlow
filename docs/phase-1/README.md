# Phase 1 — first production vertical slice

Phase 1 turns the Phase 0 production foundation into one demonstrable,
tenant-safe case journey. Work is delivered contract-first so UI, API and data
implementation use the same vocabulary and validation rules.

## Delivery sequence

1. Lock UI-facing case contracts and the first route map.
2. Close the identified persistence gaps with an additive migration.
3. Implement membership resolution and tenant-scoped case commands.
4. Expose the versioned API behind the production-core feature flag.
5. Integrate the approved UI/UX designs.
6. Complete approval, authority, provider, document and evidence-trail steps.
7. Prove the entire slice with cross-tenant and rollback tests.

## First-slice boundary

The first slice supports one traveller per case and flight, accommodation and
transfer components. The domain remains capable of later group-travel
expansion, but group persistence and traveller-specific component allocation
are not implied by this slice.

Formal submission is immutable, idempotent and billable. Saving a draft is not.
The client never supplies an organisation ID or directly patches case status.
