create index information_requests_snapshot
  on public.travel_case_information_requests (submission_snapshot_id);

create index review_assignments_coordinator_membership
  on public.travel_case_review_assignments (coordinator_membership_id);

create index review_assignments_releaser
  on public.travel_case_review_assignments (released_by_membership_id)
  where released_by_membership_id is not null;
