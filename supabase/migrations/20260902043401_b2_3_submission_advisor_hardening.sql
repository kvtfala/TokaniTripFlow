create policy organisation_submission_policies_server_only
on public.organisation_submission_policies for all to anon, authenticated
using (false) with check (false);

create policy submission_snapshots_server_only
on public.travel_case_submission_snapshots for all to anon, authenticated
using (false) with check (false);

create policy commercial_usage_events_server_only
on public.commercial_usage_events for all to anon, authenticated
using (false) with check (false);

create index submission_snapshots_submitter
on public.travel_case_submission_snapshots (submitted_by_membership_id);

create index commercial_usage_case
on public.commercial_usage_events (organisation_id, travel_case_id);
