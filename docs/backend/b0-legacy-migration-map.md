# B0 legacy-to-production migration map

Baseline: `38a166ac55047f9c55899d05b67583394bb87ae4`

This map prevents legacy convenience structures from becoming the production
security model. Supabase PostgreSQL remains the single operational database.

| Baseline structure | Production destination | Migration rule |
| --- | --- | --- |
| users, role and company code | `auth.users`, profiles, organisations, memberships | Identity is separated from tenant membership; company code is never accepted as proof of membership. |
| travel requests | travel cases, travellers, service components, case events | Preserve source identifiers; convert state through an explicit mapping; reject orphan tenant references. |
| travel quotes | provider offers and sourcing records | Migrate only after provider ownership and case tenancy reconcile. |
| expense claims | finance transactions and expense records | Keep finance facts separate from case status and preserve immutable evidence. |
| delegate assignments | membership-scoped delegations | Require start, end, grantor and delegated capability; do not copy unrestricted roles. |
| quote policies | versioned tenant policy configuration | Record effective dates and policy version used by each decision. |
| vendors | providers and tenant-provider relationships | Separate global provider identity from each tenant's commercial relationship. |
| public document URLs | private case documents and versions | Re-ingest into private storage; classify, checksum and authorize every object. |
| local/demo sessions | Supabase Auth sessions | Do not migrate passwords, session tokens or client-authenticated roles. |

## Migration sequence

1. Expand: introduce production tables, constraints, RLS and compatibility reads.
2. Rehearse: migrate a sanitized copy and reconcile counts, ownership and hashes.
3. Migrate: use repeatable batches with a migration-run identifier and reject log.
4. Verify: compare tenant totals, state mappings, documents and financial values.
5. Cut over: stop legacy writes, run the delta, then switch reads.
6. Contract: remove compatibility paths only after rollback expiry and evidence sign-off.

No destructive legacy cleanup occurs in the same release as cutover. A rollback
restores routing to the unchanged legacy store; production writes made after
cutover must be exported and reconciled before rollback.

## Mandatory gates

- zero cross-tenant or orphan relationships;
- 100% mapped state values or documented rejects;
- document count and checksum reconciliation;
- financial control totals reconciled by tenant;
- a named business owner approves exceptions; and
- security evidence records the migration runner, time and source revision.
