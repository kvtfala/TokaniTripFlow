-- Index every B2.6 foreign-key path used by deletion checks and joins.
-- These indexes are deliberately added in a separate migration so the live
-- migration history remains append-only and reproducible.

create index authorities_to_proceed_approval_cycle_idx
  on public.authorities_to_proceed (approval_cycle_id);

create index authorities_to_proceed_issuer_idx
  on public.authorities_to_proceed (organisation_id, issued_by_membership_id);

create index authorities_to_proceed_submission_snapshot_idx
  on public.authorities_to_proceed (submission_snapshot_id);

create index organisation_providers_creator_idx
  on public.organisation_providers (organisation_id, created_by_membership_id);

create index service_components_provider_idx
  on public.service_components (organisation_id, provider_id)
  where provider_id is not null;
