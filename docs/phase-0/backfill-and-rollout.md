# Backfill and rollout control

The production-core migration is deliberately inactive until an operator enables
it. `TRIPFLOW_PRODUCTION_CORE_ENABLED` defaults to false; only the exact value
`true` activates new command handling.

## Safe execution order

1. Take and verify a database backup.
2. Apply `0001_phase0_production_core.sql`.
3. Apply `0002_phase0_backfill.sql` in a non-production environment.
4. Confirm the reconciliation block completes without an exception.
5. Inspect tenant, case, component and event counts per organisation.
6. Run application verification with the feature flag still disabled.
7. Enable the flag for an internal tenant only after access tests pass.

The backfill is idempotent. It updates stable organisation and case mappings,
adds missing service components and avoids duplicate legacy events. It does not
delete or rewrite the existing `travel_requests` records.

## Rollback

Before the flag is enabled, rollback is limited to disabling or removing the new
tables; the current application remains on its original model. After any new
core writes begin, preserve the append-only case events and use a forward repair
rather than dropping production evidence.
