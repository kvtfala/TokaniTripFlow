# B0 frontend reconciliation at commit 38a166a

The review is limited to the exact pinned frontend commit. Later frontend work
is excluded until an explicit impact review changes the baseline.

## Production vertical slice

The `/cases`, `/cases/new` and `/cases/:caseId` experiences are the approved
forward path. They use `/api/v1/travel-cases`, shared validation contracts,
tenant-neutral detail failures and a production-core feature flag.

The API client now covers all six Phase 1 routes and parses the standardized
error envelope, including correlation IDs. Screens may add edit, component and
submission controls later without changing the transport contract.

## Legacy screen disposition

| Frontend area | Current dependency | B0 decision |
| --- | --- | --- |
| New Request, My Trips and Request Detail | `/api/requests` and quote subroutes | Legacy demonstration path; migrate by workflow slice after Phase 1 cases stabilize. Do not extend its data model. |
| Approvals and token approval | request approval/rejection/token routes | Redesign around immutable approval decisions and scoped tokens before production use. |
| Coordinator, Manager and Travel Desk dashboards | legacy request aggregation | Read from future case projections; never authorize from dashboard filtering. |
| Expenses and Reports | expense claim and broad reporting routes | Move to tenant-scoped finance facts and capability-specific reporting APIs. |
| Delegations | legacy delegation CRUD | Replace with time-bound membership capability delegation. |
| Admin Portal | role-gated admin endpoints | Split tenant configuration capabilities; `tenant:admin` grants no automatic operational or restricted-data access. |
| Uploads and OCR | legacy object upload endpoints | Replace with private, classified case-document storage and signed operations. |
| Demo login and role/tenant contexts | client role/company selection | Demonstration only; replace with Supabase Auth plus server-resolved membership in B2. |
| Travel Watch and advisory feeds | mixed static/external sources | Keep isolated until provenance, availability and tenant exposure rules are defined. |

## Forward-build rule

New production work uses the Phase 1 contracts. Legacy routes remain available
only for the demonstration while migration occurs; they must not be made a
dependency of the production case slice. Removal occurs after equivalent
production flows, reconciliation and rollback windows are complete.
