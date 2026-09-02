create table public.travel_cases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  reference_number text not null,
  traveller_user_id uuid references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 255),
  purpose text not null check (char_length(purpose) between 1 and 4000),
  case_type text check (case_type in ('corporate','official','project','group','urgent','medical_related','other')),
  status text not null default 'draft' check (status in ('draft','submitted','in_review','approved','authorised','coordinating','booked','in_travel','completed','cancelled','rejected')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  start_date date,
  end_date date,
  destination jsonb,
  funding jsonb,
  required_component_types text[] not null default '{}',
  owner_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  current_dependency text,
  next_action text,
  version integer not null default 0 check (version >= 0),
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, reference_number),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (destination is null or jsonb_typeof(destination) = 'object'),
  check (funding is null or jsonb_typeof(funding) = 'object')
);
create table public.service_components (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null,
  travel_case_id uuid not null,
  type text not null check (type in ('flight','accommodation','ground_transport','venue','visa','insurance','medical_clearance','other')),
  status text not null default 'required', sequence integer not null default 0 check (sequence >= 0),
  requirements jsonb not null default '{}'::jsonb check (jsonb_typeof(requirements) = 'object'),
  provider_id uuid, provider_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete cascade
);
create table public.case_events (
  id bigint generated always as identity primary key, organisation_id uuid not null, travel_case_id uuid not null,
  actor_membership_id uuid references public.organisation_memberships(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 100), from_status text, to_status text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  correlation_id text not null check (char_length(correlation_id) between 8 and 128), occurred_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict
);
create index travel_cases_org_updated on public.travel_cases (organisation_id, updated_at desc);
create index travel_cases_org_status on public.travel_cases (organisation_id, status);
create index travel_cases_traveller on public.travel_cases (traveller_user_id);
create index travel_cases_owner on public.travel_cases (owner_membership_id);
create index service_components_org_case on public.service_components (organisation_id, travel_case_id, sequence);
create index case_events_org_case_time on public.case_events (organisation_id, travel_case_id, occurred_at desc);
create index case_events_actor on public.case_events (actor_membership_id);
alter table public.travel_cases enable row level security; alter table public.travel_cases force row level security;
alter table public.service_components enable row level security; alter table public.service_components force row level security;
alter table public.case_events enable row level security; alter table public.case_events force row level security;
revoke all on table public.travel_cases, public.service_components, public.case_events from public, anon, authenticated;
revoke all on sequence public.case_events_id_seq from public, anon, authenticated;
create policy travel_cases_select_active_member on public.travel_cases for select to authenticated using ((select app_private.is_active_member(organisation_id)));
create policy service_components_select_active_member on public.service_components for select to authenticated using ((select app_private.is_active_member(organisation_id)));
create policy case_events_select_active_member on public.case_events for select to authenticated using ((select app_private.is_active_member(organisation_id)));
create function public.create_travel_case_draft(target_organisation_id uuid, actor_membership_id uuid, reference_number text, title text, purpose text, case_type text, priority text, traveller_user_id uuid, start_date date, end_date date, destination jsonb, funding jsonb, required_component_types text[], correlation_id text)
returns public.travel_cases language plpgsql security invoker set search_path = pg_catalog, public as $$
declare created public.travel_cases;
begin
  insert into public.travel_cases (organisation_id,reference_number,title,purpose,case_type,priority,traveller_user_id,start_date,end_date,destination,funding,required_component_types,owner_membership_id)
  values (target_organisation_id,reference_number,title,purpose,case_type,priority,traveller_user_id,start_date,end_date,destination,funding,coalesce(required_component_types,'{}'::text[]),actor_membership_id) returning * into created;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,payload,correlation_id)
  values (target_organisation_id,created.id,actor_membership_id,'case.draft_created',jsonb_build_object('version',created.version),correlation_id);
  return created;
end; $$;
revoke all on function public.create_travel_case_draft(uuid,uuid,text,text,text,text,text,uuid,date,date,jsonb,jsonb,text[],text) from public, anon, authenticated;
grant execute on function public.create_travel_case_draft(uuid,uuid,text,text,text,text,text,uuid,date,date,jsonb,jsonb,text[],text) to service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public;
