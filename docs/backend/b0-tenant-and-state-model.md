# B0 tenant constraints and case-state model

Baseline: `38a166ac55047f9c55899d05b67583394bb87ae4`

## Tenant integrity rule

Every operational row is owned by an organisation. A child stores both its
`organisation_id` and parent identifier, and the database verifies the pair by
a composite foreign key to a matching organisation/parent unique key. This
prevents a valid child ID from being attached to a parent in another tenant.

The same boundary is enforced in four places: authenticated membership,
Express capability and case-scope authorization, PostgreSQL constraints, and
Supabase row-level security. The browser-supplied organisation is never
authoritative. Case-specific denial and absence both return the standard
neutral `not_found` envelope.

RLS policies must define both visibility (`USING`) and mutation eligibility
(`WITH CHECK`). Elevated service credentials stay server-only. Views exposed
through the API use invoker security, and privileged database functions receive
explicit search paths and narrowly scoped grants.

## State is a projection, not a catch-all flag

| Concern | Authoritative fact | Effect on case projection |
| --- | --- | --- |
| Case lifecycle | case transition plus version | Draft, submitted, active, completed or cancelled |
| Approval | immutable decision record and policy version | May block progression; does not overwrite provider or finance facts |
| Authority to Proceed | separately issued/revoked authority record | Permits controlled downstream action after prerequisites pass |
| Provider fulfilment | component/provider offer and booking facts | Produces sourcing, booking and fulfilment dependencies |
| Finance | commitment, invoice, expense and reconciliation facts | Produces finance dependencies and closure readiness |

Transitions are server commands. Each validates the expected case version,
current facts, actor capability, delegation and tenant policy in one database
transaction. It appends an audit event and updates the projection atomically.

## Child-table constraint template

For each case child (component, traveller, decision, authority, provider offer,
finance record, document, comment and event):

- non-null `organisation_id` and parent ID;
- composite foreign key `(organisation_id, parent_id)`;
- unique/idempotency constraints for replayable commands;
- immutable creator and created timestamp;
- version or append-only semantics appropriate to the fact; and
- indexed RLS predicates and parent lookups.
