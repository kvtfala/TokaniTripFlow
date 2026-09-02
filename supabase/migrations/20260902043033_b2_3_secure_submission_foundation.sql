create table public.organisation_submission_policies (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  settings jsonb not null default '{"requiredFields":["purpose","traveller","dates","destination","components","funding"]}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.travel_case_submission_snapshots (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  submission_number integer not null check (submission_number > 0),
  case_version integer not null check (case_version > 0),
  idempotency_key uuid not null,
  submitted_by_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  policy_version integer not null check (policy_version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  submitted_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  unique (organisation_id, travel_case_id, submission_number),
  unique (organisation_id, travel_case_id, idempotency_key)
);

create table public.commercial_usage_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  travel_case_id uuid not null,
  submission_snapshot_id uuid not null references public.travel_case_submission_snapshots(id) on delete restrict,
  event_type text not null check (event_type in ('case_submitted')),
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  rating_status text not null default 'pending' check (rating_status in ('pending','rated','invoiced','credited')),
  occurred_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  unique (submission_snapshot_id, event_type)
);

create index submission_snapshots_case_time on public.travel_case_submission_snapshots (organisation_id, travel_case_id, submitted_at desc);
create index commercial_usage_org_status_time on public.commercial_usage_events (organisation_id, rating_status, occurred_at);
alter table public.organisation_submission_policies enable row level security;
alter table public.organisation_submission_policies force row level security;
alter table public.travel_case_submission_snapshots enable row level security;
alter table public.travel_case_submission_snapshots force row level security;
alter table public.commercial_usage_events enable row level security;
alter table public.commercial_usage_events force row level security;
revoke all on table public.organisation_submission_policies, public.travel_case_submission_snapshots, public.commercial_usage_events from public, anon, authenticated;

create function public.submit_travel_case(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid, actor_membership_id uuid,
  expected_version integer, request_idempotency_key uuid, attestation boolean, case_type text,
  traveller_user_id uuid, start_date date, end_date date, destination jsonb, funding jsonb,
  required_component_types text[], correlation_id text
) returns public.travel_cases language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  current_case public.travel_cases;
  submitted_case public.travel_cases;
  existing_snapshot public.travel_case_submission_snapshots;
  created_snapshot public.travel_case_submission_snapshots;
  policy_record public.organisation_submission_policies;
  component_snapshot jsonb;
  next_submission_number integer;
begin
  select * into current_case from public.travel_cases
  where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (
    select 1 from public.organisation_memberships m
    where m.id = actor_membership_id and m.user_id = actor_user_id
      and m.organisation_id = target_organisation_id and m.status = 'active'
  ) or current_case.owner_membership_id <> actor_membership_id
    then raise exception using errcode = '42501', message = 'submission_forbidden'; end if;

  select * into existing_snapshot from public.travel_case_submission_snapshots s
  where s.organisation_id = target_organisation_id and s.travel_case_id = target_case_id
    and s.idempotency_key = request_idempotency_key;
  if found then return current_case; end if;

  if current_case.status <> 'draft' then raise exception using errcode = '55000', message = 'draft_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  if attestation is not true then raise exception using errcode = '23514', message = 'attestation_required'; end if;
  if case_type is null or traveller_user_id is null or start_date is null or end_date is null
     or destination is null or funding is null or coalesce(array_length(required_component_types,1),0) = 0
    then raise exception using errcode = '23514', message = 'submission_incomplete'; end if;
  if end_date < start_date then raise exception using errcode = '23514', message = 'invalid_date_range'; end if;
  if not exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = target_organisation_id and m.user_id = traveller_user_id and m.status = 'active'
  ) then raise exception using errcode = '23514', message = 'traveller_membership_required'; end if;
  if exists (
    select 1 from unnest(required_component_types) required_type
    where not exists (
      select 1 from public.service_components sc
      where sc.organisation_id = target_organisation_id and sc.travel_case_id = target_case_id and sc.type = required_type
    )
  ) then raise exception using errcode = '23514', message = 'required_component_missing'; end if;

  select * into policy_record from public.organisation_submission_policies where organisation_id = target_organisation_id;
  if not found then
    policy_record.organisation_id := target_organisation_id;
    policy_record.version := 1;
    policy_record.settings := '{"requiredFields":["purpose","traveller","dates","destination","components","funding"]}'::jsonb;
  end if;

  update public.travel_cases set
    case_type = submit_travel_case.case_type,
    traveller_user_id = submit_travel_case.traveller_user_id,
    start_date = submit_travel_case.start_date,
    end_date = submit_travel_case.end_date,
    destination = submit_travel_case.destination,
    funding = submit_travel_case.funding,
    required_component_types = submit_travel_case.required_component_types,
    status = 'submitted', submitted_at = now(),
    current_dependency = 'coordinator', next_action = 'Review submitted case',
    version = version + 1, updated_at = now()
  where organisation_id = target_organisation_id and id = target_case_id
  returning * into submitted_case;

  select coalesce(jsonb_agg(to_jsonb(sc) - 'idempotency_key' order by sc.sequence), '[]'::jsonb)
  into component_snapshot from public.service_components sc
  where sc.organisation_id = target_organisation_id and sc.travel_case_id = target_case_id;
  select coalesce(max(submission_number),0) + 1 into next_submission_number
  from public.travel_case_submission_snapshots where organisation_id = target_organisation_id and travel_case_id = target_case_id;

  insert into public.travel_case_submission_snapshots (
    organisation_id,travel_case_id,submission_number,case_version,idempotency_key,
    submitted_by_membership_id,policy_version,snapshot
  ) values (
    target_organisation_id,target_case_id,next_submission_number,submitted_case.version,request_idempotency_key,
    actor_membership_id,policy_record.version,
    jsonb_build_object(
      'case',to_jsonb(submitted_case),
      'components',component_snapshot,
      'attestation',true,
      'policy',policy_record.settings,
      'submittedBy',jsonb_build_object('userId',actor_user_id,'membershipId',actor_membership_id)
    )
  ) returning * into created_snapshot;

  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'case.submitted','draft','submitted',
    jsonb_build_object('snapshot_id',created_snapshot.id,'submission_number',created_snapshot.submission_number,'from_version',expected_version,'to_version',submitted_case.version),correlation_id);
  insert into public.commercial_usage_events (organisation_id,travel_case_id,submission_snapshot_id,event_type)
  values (target_organisation_id,target_case_id,created_snapshot.id,'case_submitted');
  return submitted_case;
end; $$;

revoke all on function public.submit_travel_case(uuid,uuid,uuid,uuid,integer,uuid,boolean,text,uuid,date,date,jsonb,jsonb,text[],text) from public, anon, authenticated;
grant execute on function public.submit_travel_case(uuid,uuid,uuid,uuid,integer,uuid,boolean,text,uuid,date,date,jsonb,jsonb,text[],text) to service_role;
