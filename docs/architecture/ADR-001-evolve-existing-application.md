# ADR-001: Evolve the existing application

- Status: Accepted for Phase 0
- Date: 2026-08-30

## Context

The repository already contains useful workflows, dashboards, provider management, policies, reporting and audit concepts. Its current data model is demo-oriented: tenant ownership relies primarily on `companyCode`, traveller details are embedded in a flat travel request, service needs are represented by flags, quotations attach to the whole request and one status carries several different business meanings.

A rewrite would discard working behaviour and delay validation. Directly changing the existing tables in place would create avoidable migration and rollback risk.

## Decision

TripFlow will evolve through an expand-migrate-contract strategy.

New production concepts will first be added alongside the current model. Data will then be backfilled and reconciled, application reads and writes will move behind explicit feature flags, and compatibility fields will only be removed after production verification.

The target core is:

`organisation -> membership -> travel case -> service component`

Case lifecycle, approval, authority to proceed, payment, provider confirmation and service fulfilment are separate state domains.

## Consequences

- Existing demonstrations remain available while foundations are introduced.
- Migrations require dual-read or dual-write periods and reconciliation checks.
- Every tenant-owned record needs an authoritative organisation key.
- New lifecycle changes must be commands with permission checks, invariants and audit effects; clients must not freely patch status fields.
- Temporary duplication is accepted in exchange for safer rollout and rollback.
