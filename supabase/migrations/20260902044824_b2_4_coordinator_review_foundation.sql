-- B2.4 coordinator review and return-for-information foundation.
-- Requester ownership remains separate from operational review assignment.

alter table public.travel_cases drop constraint travel_cases_status_check;
alter table public.travel_cases add constraint travel_cases_status_check
  check (status in ('draft','submitted','in_review','information_required','authorised','coordinating','ready_to_travel','in_travel','completed','cancelled'));

alter table public.travel_case_submission_snapshots
  add column material_change_fields text[] not null default '{}';

-- A case is commercially counted once. Corrective resubmissions create evidence,
-- but must not create another billable case event.
alter table public.commercial_usage_events
  add constraint commercial_usage_one_case_submission
  unique (organisation_id, travel_case_id, event_type);

create table public.travel_case_review_assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  coordinator_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  idempotency_key uuid not null,
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  released_by_membership_id uuid references public.organisation_memberships(id) on delete restrict,
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  unique (organisation_id, travel_case_id, idempotency_key),
  check ((released_at is null) = (released_by_membership_id is null))
);
create unique index review_assignments_one_current
  on public.travel_case_review_assignments (organisation_id, travel_case_id)
  where released_at is null;
create index review_assignments_coordinator_current
  on public.travel_case_review_assignments (organisation_id, coordinator_membership_id, assigned_at)
  where released_at is null;

create table public.travel_case_information_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  submission_snapshot_id uuid not null references public.travel_case_submission_snapshots(id) on delete restrict,
  requested_by_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  idempotency_key uuid not null,
  reason text not null check (char_length(reason) between 10 and 4000),
  requested_fields text[] not null check (cardinality(requested_fields) between 1 and 50),
  due_date date,
  requested_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  unique (organisation_id, travel_case_id, idempotency_key)
);
create index information_requests_case_time
  on public.travel_case_information_requests (organisation_id, travel_case_id, requested_at desc);
create index information_requests_requester
  on public.travel_case_information_requests (requested_by_membership_id);

create table public.travel_case_information_responses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  information_request_id uuid not null references public.travel_case_information_requests(id) on delete restrict,
  resubmission_snapshot_id uuid not null references public.travel_case_submission_snapshots(id) on delete restrict,
  responded_by_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  response_summary text not null check (char_length(response_summary) between 1 and 4000),
  responded_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  unique (information_request_id)
);
create index information_responses_case_time
  on public.travel_case_information_responses (organisation_id, travel_case_id, responded_at desc);
create index information_responses_responder
  on public.travel_case_information_responses (responded_by_membership_id);
create index information_responses_snapshot
  on public.travel_case_information_responses (resubmission_snapshot_id);

alter table public.travel_case_review_assignments enable row level security;
alter table public.travel_case_review_assignments force row level security;
alter table public.travel_case_information_requests enable row level security;
alter table public.travel_case_information_requests force row level security;
alter table public.travel_case_information_responses enable row level security;
alter table public.travel_case_information_responses force row level security;
revoke all on table public.travel_case_review_assignments,
  public.travel_case_information_requests,
  public.travel_case_information_responses from public, anon, authenticated;
create policy review_assignments_server_only on public.travel_case_review_assignments
  for all to anon, authenticated using (false) with check (false);
create policy information_requests_server_only on public.travel_case_information_requests
  for all to anon, authenticated using (false) with check (false);
create policy information_responses_server_only on public.travel_case_information_responses
  for all to anon, authenticated using (false) with check (false);

create trigger information_requests_immutable before update or delete
  on public.travel_case_information_requests for each row
  execute function app_private.reject_immutable_change();
create trigger information_responses_immutable before update or delete
  on public.travel_case_information_responses for each row
  execute function app_private.reject_immutable_change();

create function public.claim_travel_case_review(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid,
  actor_membership_id uuid, expected_version integer,
  request_idempotency_key uuid, correlation_id text
) returns public.travel_cases language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; current_assignment public.travel_case_review_assignments;
begin
  select * into current_case from public.travel_cases
  where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (
    select 1 from public.organisation_memberships m where m.id = actor_membership_id
      and m.user_id = actor_user_id and m.organisation_id = target_organisation_id
      and m.status = 'active' and m.role in ('coordinator','travel_desk','travel_admin')
  ) then raise exception using errcode = '42501', message = 'review_forbidden'; end if;
  select * into current_assignment from public.travel_case_review_assignments a
  where a.organisation_id = target_organisation_id and a.travel_case_id = target_case_id and a.released_at is null;
  if found and current_assignment.coordinator_membership_id = actor_membership_id then return current_case; end if;
  if found then raise exception using errcode = '55000', message = 'case_already_assigned'; end if;
  if current_case.status <> 'submitted' then raise exception using errcode = '55000', message = 'submitted_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  insert into public.travel_case_review_assignments
    (organisation_id, travel_case_id, coordinator_membership_id, idempotency_key)
  values (target_organisation_id, target_case_id, actor_membership_id, request_idempotency_key)
  returning * into current_assignment;
  update public.travel_cases set status = 'in_review', current_dependency = 'coordinator',
    next_action = 'Complete review or request information', version = version + 1, updated_at = now()
  where organisation_id = target_organisation_id and id = target_case_id returning * into current_case;
  insert into public.case_events
    (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'review.claimed','submitted','in_review',
    jsonb_build_object('assignment_id',current_assignment.id,'from_version',expected_version,'to_version',current_case.version),correlation_id);
  return current_case;
end; $$;

create function public.request_travel_case_information(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid,
  actor_membership_id uuid, expected_version integer, request_idempotency_key uuid,
  reason text, requested_fields text[], due_date date, correlation_id text
) returns public.travel_cases language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; assignment public.travel_case_review_assignments;
  latest_snapshot public.travel_case_submission_snapshots; existing_request public.travel_case_information_requests;
begin
  select * into current_case from public.travel_cases
  where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (
    select 1 from public.organisation_memberships m where m.id = actor_membership_id
      and m.user_id = actor_user_id and m.organisation_id = target_organisation_id
      and m.status = 'active' and m.role in ('coordinator','travel_desk','travel_admin')
  ) then raise exception using errcode = '42501', message = 'review_forbidden'; end if;
  select * into existing_request from public.travel_case_information_requests r
  where r.organisation_id = target_organisation_id and r.travel_case_id = target_case_id
    and r.idempotency_key = request_idempotency_key;
  if found then return current_case; end if;
  select * into assignment from public.travel_case_review_assignments a
  where a.organisation_id = target_organisation_id and a.travel_case_id = target_case_id and a.released_at is null;
  if not found or (assignment.coordinator_membership_id <> actor_membership_id and not exists (
    select 1 from public.organisation_memberships m where m.id = actor_membership_id
      and m.role = 'travel_admin'
  )) then raise exception using errcode = '42501', message = 'review_assignment_required'; end if;
  if current_case.status <> 'in_review' then raise exception using errcode = '55000', message = 'review_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  select * into latest_snapshot from public.travel_case_submission_snapshots s
  where s.organisation_id = target_organisation_id and s.travel_case_id = target_case_id
  order by s.submission_number desc limit 1;
  if not found then raise exception using errcode = '55000', message = 'submission_snapshot_required'; end if;
  insert into public.travel_case_information_requests
    (organisation_id,travel_case_id,submission_snapshot_id,requested_by_membership_id,idempotency_key,reason,requested_fields,due_date)
  values (target_organisation_id,target_case_id,latest_snapshot.id,actor_membership_id,request_idempotency_key,reason,requested_fields,due_date)
  returning * into existing_request;
  update public.travel_cases set status = 'information_required', current_dependency = 'requester',
    next_action = 'Provide requested information and resubmit', version = version + 1, updated_at = now()
  where organisation_id = target_organisation_id and id = target_case_id returning * into current_case;
  insert into public.case_events
    (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'review.information_requested','in_review','information_required',
    jsonb_build_object('information_request_id',existing_request.id,'snapshot_id',latest_snapshot.id,
      'requested_fields',requested_fields,'due_date',due_date,'from_version',expected_version,'to_version',current_case.version),correlation_id);
  return current_case;
end; $$;

-- Returned cases may be corrected by their requester. Original submission evidence remains immutable.
create or replace function public.update_travel_case_draft(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid, actor_membership_id uuid,
  expected_version integer, patch jsonb, correlation_id text
) returns public.travel_cases language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; updated_case public.travel_cases; changed_fields text[];
begin
  if jsonb_typeof(patch) <> 'object' or patch = '{}'::jsonb then raise exception using errcode = '23514', message = 'empty_patch'; end if;
  if exists (select 1 from jsonb_object_keys(patch) as keys(field_name) where field_name not in ('title','purpose','caseType','priority','travellerUserId','startDate','endDate','destination','funding','requiredComponentTypes'))
    then raise exception using errcode = '23514', message = 'unknown_patch_field'; end if;
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
     or current_case.owner_membership_id <> actor_membership_id then raise exception using errcode = '42501', message = 'draft_edit_forbidden'; end if;
  if current_case.status not in ('draft','information_required') then raise exception using errcode = '55000', message = 'editable_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  if patch ? 'travellerUserId' and nullif(patch->>'travellerUserId','') is not null and not exists (
    select 1 from public.organisation_memberships m where m.organisation_id = target_organisation_id and m.user_id = (patch->>'travellerUserId')::uuid and m.status = 'active'
  ) then raise exception using errcode = '23514', message = 'traveller_membership_required'; end if;
  changed_fields := array(select jsonb_object_keys(patch));
  update public.travel_cases set
    title = case when patch ? 'title' then patch->>'title' else title end,
    purpose = case when patch ? 'purpose' then patch->>'purpose' else purpose end,
    case_type = case when patch ? 'caseType' then patch->>'caseType' else case_type end,
    priority = case when patch ? 'priority' then patch->>'priority' else priority end,
    traveller_user_id = case when patch ? 'travellerUserId' then nullif(patch->>'travellerUserId','')::uuid else traveller_user_id end,
    start_date = case when patch ? 'startDate' then nullif(patch->>'startDate','')::date else start_date end,
    end_date = case when patch ? 'endDate' then nullif(patch->>'endDate','')::date else end_date end,
    destination = case when patch ? 'destination' then case when patch->'destination' = 'null'::jsonb then null else patch->'destination' end else destination end,
    funding = case when patch ? 'funding' then case when patch->'funding' = 'null'::jsonb then null else patch->'funding' end else funding end,
    required_component_types = case when patch ? 'requiredComponentTypes' then array(select jsonb_array_elements_text(patch->'requiredComponentTypes')) else required_component_types end,
    version = version + 1, updated_at = now()
  where organisation_id = target_organisation_id and id = target_case_id returning * into updated_case;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,
    case when current_case.status = 'draft' then 'case.draft_updated' else 'case.returned_information_updated' end,
    jsonb_build_object('from_version',expected_version,'to_version',updated_case.version,'changed_fields',changed_fields),correlation_id);
  return updated_case;
end; $$;

create or replace function public.add_service_component(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid, actor_membership_id uuid,
  expected_version integer, request_idempotency_key uuid, component_type text,
  component_sequence integer, requirements jsonb, correlation_id text
) returns public.service_components language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; existing_component public.service_components; created_component public.service_components;
begin
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
     or current_case.owner_membership_id <> actor_membership_id then raise exception using errcode = '42501', message = 'draft_edit_forbidden'; end if;
  select * into existing_component from public.service_components sc where sc.organisation_id = target_organisation_id and sc.travel_case_id = target_case_id and sc.idempotency_key = request_idempotency_key;
  if found then return existing_component; end if;
  if current_case.status not in ('draft','information_required') then raise exception using errcode = '55000', message = 'editable_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  insert into public.service_components (organisation_id,travel_case_id,type,sequence,requirements,idempotency_key)
  values (target_organisation_id,target_case_id,component_type,component_sequence,requirements,request_idempotency_key) returning * into created_component;
  update public.travel_cases set version = version + 1, updated_at = now() where organisation_id = target_organisation_id and id = target_case_id;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'component.added',jsonb_build_object('component_id',created_component.id,'type',created_component.type,'from_version',expected_version,'to_version',expected_version + 1),correlation_id);
  return created_component;
end; $$;

create function public.update_service_component(
  target_organisation_id uuid, target_case_id uuid, target_component_id uuid,
  actor_user_id uuid, actor_membership_id uuid, expected_version integer,
  request_idempotency_key uuid, component_sequence integer, requirements jsonb,
  disposition text, correlation_id text
) returns public.service_components language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; component public.service_components;
begin
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
     or current_case.owner_membership_id <> actor_membership_id then raise exception using errcode = '42501', message = 'component_edit_forbidden'; end if;
  if current_case.status not in ('draft','information_required') then raise exception using errcode = '55000', message = 'editable_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  select * into component from public.service_components where organisation_id = target_organisation_id and travel_case_id = target_case_id and id = target_component_id;
  if not found then raise exception using errcode = 'P0002', message = 'component_not_found'; end if;
  if exists (select 1 from public.case_events e where e.organisation_id = target_organisation_id and e.travel_case_id = target_case_id and e.event_type = 'component.updated' and e.payload->>'idempotency_key' = request_idempotency_key::text) then return component; end if;
  update public.service_components set sequence = coalesce(component_sequence, sequence),
    requirements = coalesce(update_service_component.requirements, requirements),
    status = case when disposition = 'withdrawn' then 'withdrawn' when disposition = 'active' then 'required' else status end,
    updated_at = now()
  where organisation_id = target_organisation_id and travel_case_id = target_case_id and id = target_component_id returning * into component;
  update public.travel_cases set version = version + 1, updated_at = now() where organisation_id = target_organisation_id and id = target_case_id;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'component.updated',
    jsonb_build_object('component_id',target_component_id,'disposition',disposition,'idempotency_key',request_idempotency_key,'from_version',expected_version,'to_version',expected_version + 1),correlation_id);
  return component;
end; $$;

drop function public.submit_travel_case(uuid,uuid,uuid,uuid,integer,uuid,boolean,text,uuid,date,date,jsonb,jsonb,text[],text);
create function public.submit_travel_case(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid, actor_membership_id uuid,
  expected_status text, expected_version integer, request_idempotency_key uuid, attestation boolean,
  case_type text, traveller_user_id uuid, start_date date, end_date date, destination jsonb,
  funding jsonb, required_component_types text[], response_summary text, correlation_id text
) returns public.travel_cases language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; submitted_case public.travel_cases;
  existing_snapshot public.travel_case_submission_snapshots; created_snapshot public.travel_case_submission_snapshots;
  previous_snapshot public.travel_case_submission_snapshots; policy_record public.organisation_submission_policies;
  component_snapshot jsonb; next_submission_number integer; material_fields text[] := '{}';
begin
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
     or current_case.owner_membership_id <> actor_membership_id then raise exception using errcode = '42501', message = 'submission_forbidden'; end if;
  select * into existing_snapshot from public.travel_case_submission_snapshots s where s.organisation_id = target_organisation_id and s.travel_case_id = target_case_id and s.idempotency_key = request_idempotency_key;
  if found then return current_case; end if;
  if expected_status not in ('draft','information_required') or current_case.status <> expected_status then raise exception using errcode = '55000', message = 'expected_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  if current_case.status = 'information_required' and coalesce(length(trim(response_summary)),0) = 0 then raise exception using errcode = '23514', message = 'response_summary_required'; end if;
  if attestation is not true then raise exception using errcode = '23514', message = 'attestation_required'; end if;
  if case_type is null or traveller_user_id is null or start_date is null or end_date is null or destination is null or funding is null or coalesce(array_length(required_component_types,1),0) = 0 then raise exception using errcode = '23514', message = 'submission_incomplete'; end if;
  if end_date < start_date then raise exception using errcode = '23514', message = 'invalid_date_range'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.organisation_id = target_organisation_id and m.user_id = traveller_user_id and m.status = 'active') then raise exception using errcode = '23514', message = 'traveller_membership_required'; end if;
  if exists (select 1 from unnest(required_component_types) required_type where not exists (
    select 1 from public.service_components sc where sc.organisation_id = target_organisation_id and sc.travel_case_id = target_case_id and sc.type = required_type and sc.status <> 'withdrawn'
  )) then raise exception using errcode = '23514', message = 'required_component_missing'; end if;
  select * into policy_record from public.organisation_submission_policies where organisation_id = target_organisation_id;
  if not found then policy_record.organisation_id := target_organisation_id; policy_record.version := 1; policy_record.settings := '{"requiredFields":["purpose","traveller","dates","destination","components","funding"]}'::jsonb; end if;
  select * into previous_snapshot from public.travel_case_submission_snapshots s where s.organisation_id = target_organisation_id and s.travel_case_id = target_case_id order by submission_number desc limit 1;
  if found then
    material_fields := array_remove(array[
      case when previous_snapshot.snapshot->'case'->>'traveller_user_id' is distinct from traveller_user_id::text then 'traveller' end,
      case when previous_snapshot.snapshot->'case'->>'start_date' is distinct from start_date::text or previous_snapshot.snapshot->'case'->>'end_date' is distinct from end_date::text then 'dates' end,
      case when previous_snapshot.snapshot->'case'->'destination' is distinct from destination then 'destination' end,
      case when previous_snapshot.snapshot->'case'->'funding' is distinct from funding then 'funding' end,
      case when previous_snapshot.snapshot->'case'->'required_component_types' is distinct from to_jsonb(required_component_types) then 'required_components' end
    ], null);
  end if;
  update public.travel_cases set case_type = submit_travel_case.case_type, traveller_user_id = submit_travel_case.traveller_user_id,
    start_date = submit_travel_case.start_date, end_date = submit_travel_case.end_date, destination = submit_travel_case.destination,
    funding = submit_travel_case.funding, required_component_types = submit_travel_case.required_component_types,
    status = 'submitted', submitted_at = now(), current_dependency = 'coordinator', next_action = 'Review submitted case',
    version = version + 1, updated_at = now()
  where organisation_id = target_organisation_id and id = target_case_id returning * into submitted_case;
  select coalesce(jsonb_agg(to_jsonb(sc) - 'idempotency_key' order by sc.sequence), '[]'::jsonb) into component_snapshot
  from public.service_components sc where sc.organisation_id = target_organisation_id and sc.travel_case_id = target_case_id;
  select coalesce(max(submission_number),0) + 1 into next_submission_number from public.travel_case_submission_snapshots where organisation_id = target_organisation_id and travel_case_id = target_case_id;
  insert into public.travel_case_submission_snapshots
    (organisation_id,travel_case_id,submission_number,case_version,idempotency_key,submitted_by_membership_id,policy_version,snapshot,material_change_fields)
  values (target_organisation_id,target_case_id,next_submission_number,submitted_case.version,request_idempotency_key,actor_membership_id,policy_record.version,
    jsonb_build_object('case',to_jsonb(submitted_case),'components',component_snapshot,'attestation',true,'policy',policy_record.settings,
      'responseSummary',response_summary,'submittedBy',jsonb_build_object('userId',actor_user_id,'membershipId',actor_membership_id)),material_fields)
  returning * into created_snapshot;
  if expected_status = 'information_required' then
    insert into public.travel_case_information_responses
      (organisation_id,travel_case_id,information_request_id,resubmission_snapshot_id,responded_by_membership_id,response_summary)
    select target_organisation_id,target_case_id,r.id,created_snapshot.id,actor_membership_id,response_summary
    from public.travel_case_information_requests r where r.organisation_id = target_organisation_id and r.travel_case_id = target_case_id
      and not exists (select 1 from public.travel_case_information_responses x where x.information_request_id = r.id);
  end if;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,case when expected_status = 'draft' then 'case.submitted' else 'case.resubmitted' end,
    expected_status,'submitted',jsonb_build_object('snapshot_id',created_snapshot.id,'submission_number',created_snapshot.submission_number,
      'material_change_fields',material_fields,'from_version',expected_version,'to_version',submitted_case.version),correlation_id);
  insert into public.commercial_usage_events (organisation_id,travel_case_id,submission_snapshot_id,event_type)
  values (target_organisation_id,target_case_id,created_snapshot.id,'case_submitted')
  on conflict (organisation_id,travel_case_id,event_type) do nothing;
  return submitted_case;
end; $$;

revoke all on function public.claim_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,text) from public, anon, authenticated;
grant execute on function public.claim_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,text) to service_role;
revoke all on function public.request_travel_case_information(uuid,uuid,uuid,uuid,integer,uuid,text,text[],date,text) from public, anon, authenticated;
grant execute on function public.request_travel_case_information(uuid,uuid,uuid,uuid,integer,uuid,text,text[],date,text) to service_role;
revoke all on function public.update_service_component(uuid,uuid,uuid,uuid,uuid,integer,uuid,integer,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.update_service_component(uuid,uuid,uuid,uuid,uuid,integer,uuid,integer,jsonb,text,text) to service_role;
revoke all on function public.submit_travel_case(uuid,uuid,uuid,uuid,text,integer,uuid,boolean,text,uuid,date,date,jsonb,jsonb,text[],text,text) from public, anon, authenticated;
grant execute on function public.submit_travel_case(uuid,uuid,uuid,uuid,text,integer,uuid,boolean,text,uuid,date,date,jsonb,jsonb,text[],text,text) to service_role;
