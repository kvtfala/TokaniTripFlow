-- B2.6 Authority to Proceed (ATP) and minimum provider identity foundation.
-- ATP is an operational authority record. It is not an approval, PO/LPO,
-- payment record, provider confirmation, booking, or ticketing evidence.

create table public.organisation_providers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  trading_name text check (trading_name is null or char_length(trading_name) between 2 and 200),
  external_reference text check (external_reference is null or char_length(external_reference) between 1 and 100),
  status text not null default 'eligible' check (status in ('eligible','suspended','retired')),
  created_by_membership_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id)
    references public.organisation_memberships(organisation_id, id) on delete restrict
);
create unique index organisation_providers_legal_name
  on public.organisation_providers (organisation_id, lower(legal_name));
create index organisation_providers_eligible
  on public.organisation_providers (organisation_id, legal_name) where status = 'eligible';

alter table public.service_components
  add constraint service_components_provider_same_org
  foreign key (organisation_id, provider_id)
  references public.organisation_providers(organisation_id, id) on delete restrict;

create table public.authorities_to_proceed (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  approval_cycle_id uuid not null references public.approval_cycles(id) on delete restrict,
  submission_snapshot_id uuid not null references public.travel_case_submission_snapshots(id) on delete restrict,
  provider_id uuid not null,
  authority_number text not null check (char_length(authority_number) between 8 and 100),
  idempotency_key uuid not null,
  scope_component_ids uuid[] not null check (cardinality(scope_component_ids) between 1 and 100),
  approved_option_source text not null check (approved_option_source in ('quotation','contracted_rate','external_quote','other')),
  approved_option_reference text not null check (char_length(approved_option_reference) between 1 and 255),
  approved_option_version integer not null check (approved_option_version > 0),
  option_valid_until timestamptz not null,
  amount_type text not null check (amount_type in ('exact','ceiling')),
  authorised_amount numeric(18,2) not null check (authorised_amount >= 0),
  permitted_variation_amount numeric(18,2) not null default 0 check (permitted_variation_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  funding_method text not null check (funding_method in ('lpo_po','account','transfer','card','other')),
  funding_reference text check (funding_reference is null or char_length(funding_reference) between 1 and 255),
  lpo_requirement text not null check (lpo_requirement in ('before_authority','after_authority','not_required')),
  conditions text[] not null default '{}',
  valid_until timestamptz not null,
  issued_by_membership_id uuid not null,
  authority_basis jsonb not null check (jsonb_typeof(authority_basis) = 'object'),
  provider_snapshot jsonb not null check (jsonb_typeof(provider_snapshot) = 'object'),
  issued_at timestamptz not null default now(),
  unique (organisation_id, authority_number),
  unique (organisation_id, travel_case_id, idempotency_key),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  foreign key (organisation_id, provider_id) references public.organisation_providers(organisation_id, id) on delete restrict,
  foreign key (organisation_id, issued_by_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  check (valid_until > issued_at),
  check (option_valid_until > issued_at),
  check (permitted_variation_amount = 0 or amount_type = 'ceiling'),
  check (lpo_requirement <> 'before_authority' or funding_reference is not null)
);
create index authorities_to_proceed_case_time
  on public.authorities_to_proceed (organisation_id, travel_case_id, issued_at desc);
create index authorities_to_proceed_provider
  on public.authorities_to_proceed (organisation_id, provider_id, issued_at desc);
create index authorities_to_proceed_expiry
  on public.authorities_to_proceed (valid_until) where valid_until > issued_at;

alter table public.organisation_providers enable row level security;
alter table public.organisation_providers force row level security;
alter table public.authorities_to_proceed enable row level security;
alter table public.authorities_to_proceed force row level security;
revoke all on table public.organisation_providers, public.authorities_to_proceed from public, anon, authenticated;
create policy organisation_providers_server_only on public.organisation_providers
  for all to anon, authenticated using (false) with check (false);
create policy authorities_to_proceed_server_only on public.authorities_to_proceed
  for all to anon, authenticated using (false) with check (false);

create trigger organisation_providers_set_updated_at before update on public.organisation_providers
  for each row execute function app_private.set_updated_at();
create trigger authorities_to_proceed_immutable before update or delete on public.authorities_to_proceed
  for each row execute function app_private.reject_immutable_change();

create function public.create_organisation_provider(
  target_organisation_id uuid, actor_user_id uuid, actor_membership_id uuid,
  provider_legal_name text, provider_trading_name text,
  provider_external_reference text, correlation_id text
) returns public.organisation_providers language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare created public.organisation_providers;
begin
  if not exists (
    select 1 from public.organisation_memberships m
    where m.id=actor_membership_id and m.user_id=actor_user_id
      and m.organisation_id=target_organisation_id and m.status='active'
      and m.role='travel_admin'
  ) then raise exception using errcode='42501', message='provider_administration_forbidden'; end if;
  insert into public.organisation_providers
    (organisation_id,legal_name,trading_name,external_reference,created_by_membership_id)
  values (target_organisation_id,provider_legal_name,provider_trading_name,provider_external_reference,actor_membership_id)
  returning * into created;
  insert into public.identity_audit_events
    (organisation_id,actor_user_id,actor_membership_id,event_type,correlation_id,details)
  values (target_organisation_id,actor_user_id,actor_membership_id,'provider.created',correlation_id,
    jsonb_build_object('provider_id',created.id,'legal_name',created.legal_name));
  return created;
end; $$;

create function public.issue_authority_to_proceed(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid,
  actor_membership_id uuid, expected_version integer, request_idempotency_key uuid,
  target_provider_id uuid, requested_scope_component_ids uuid[], approved_option_source text,
  approved_option_reference text, approved_option_version integer,
  option_valid_until timestamptz, amount_type text, authorised_amount numeric,
  permitted_variation_amount numeric, currency text, funding_method text,
  funding_reference text, lpo_requirement text, authority_conditions text[],
  authority_valid_until timestamptz, correlation_id text
) returns public.travel_cases language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare
  current_case public.travel_cases;
  membership public.organisation_memberships;
  provider public.organisation_providers;
  cycle public.approval_cycles;
  existing public.authorities_to_proceed;
  created public.authorities_to_proceed;
  component_count integer;
  authority_number text;
  previous_status text;
begin
  select * into current_case from public.travel_cases
    where organisation_id=target_organisation_id and id=target_case_id for update;
  if not found then raise exception using errcode='P0002', message='travel_case_not_found'; end if;
  previous_status := current_case.status;
  select * into membership from public.organisation_memberships m
    where m.id=actor_membership_id and m.user_id=actor_user_id
      and m.organisation_id=target_organisation_id and m.status='active'
      and m.role in ('coordinator','travel_admin');
  if not found then raise exception using errcode='42501', message='authority_to_proceed_forbidden'; end if;
  select * into existing from public.authorities_to_proceed a
    where a.organisation_id=target_organisation_id and a.travel_case_id=target_case_id
      and a.idempotency_key=request_idempotency_key;
  if found then return current_case; end if;
  if current_case.status not in ('approved','authorised') then
    raise exception using errcode='55000', message='approved_status_required'; end if;
  if current_case.version <> expected_version then
    raise exception using errcode='40001', message='version_conflict'; end if;
  select * into provider from public.organisation_providers p
    where p.id=target_provider_id and p.organisation_id=target_organisation_id and p.status='eligible';
  if not found then raise exception using errcode='42501', message='eligible_provider_required'; end if;
  select * into cycle from public.approval_cycles c
    where c.organisation_id=target_organisation_id and c.travel_case_id=target_case_id
    order by c.cycle_number desc limit 1;
  if not found or cycle.status <> 'approved' then
    raise exception using errcode='55000', message='completed_approval_required'; end if;
  if exists (select 1 from public.approval_requirements r where r.approval_cycle_id=cycle.id and r.status <> 'approved') then
    raise exception using errcode='55000', message='completed_approval_required'; end if;
  if requested_scope_component_ids is null or cardinality(requested_scope_component_ids) < 1
    or cardinality(requested_scope_component_ids) <> cardinality(array(select distinct unnest(requested_scope_component_ids))) then
    raise exception using errcode='23514', message='authority_scope_required'; end if;
  select count(*) into component_count from public.service_components c
    where c.organisation_id=target_organisation_id and c.travel_case_id=target_case_id
      and c.id=any(requested_scope_component_ids);
  if component_count <> cardinality(requested_scope_component_ids) then
    raise exception using errcode='23514', message='authority_scope_invalid'; end if;
  if exists (select 1 from public.authorities_to_proceed a
    where a.organisation_id=target_organisation_id and a.travel_case_id=target_case_id
      and a.approval_cycle_id=cycle.id and a.scope_component_ids && requested_scope_component_ids) then
    raise exception using errcode='55000', message='authority_scope_already_issued'; end if;
  if option_valid_until <= now() then raise exception using errcode='23514', message='approved_option_expired'; end if;
  if authority_valid_until <= now() or authority_valid_until > option_valid_until then
    raise exception using errcode='23514', message='authority_validity_invalid'; end if;
  if lpo_requirement='before_authority' and nullif(trim(funding_reference),'') is null then
    raise exception using errcode='23514', message='funding_reference_required'; end if;
  authority_number := 'ATP-' || to_char(clock_timestamp(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.authorities_to_proceed (
    organisation_id,travel_case_id,approval_cycle_id,submission_snapshot_id,provider_id,
    authority_number,idempotency_key,scope_component_ids,approved_option_source,
    approved_option_reference,approved_option_version,option_valid_until,amount_type,
    authorised_amount,permitted_variation_amount,currency,funding_method,funding_reference,
    lpo_requirement,conditions,valid_until,issued_by_membership_id,authority_basis,provider_snapshot
  ) values (
    target_organisation_id,target_case_id,cycle.id,cycle.submission_snapshot_id,provider.id,
    authority_number,request_idempotency_key,requested_scope_component_ids,approved_option_source,
    approved_option_reference,approved_option_version,option_valid_until,amount_type,
    authorised_amount,coalesce(permitted_variation_amount,0),upper(currency),funding_method,
    nullif(trim(funding_reference),''),lpo_requirement,coalesce(authority_conditions,'{}'::text[]),
    authority_valid_until,actor_membership_id,
    jsonb_build_object('approval_cycle_id',cycle.id,'approval_cycle_number',cycle.cycle_number,
      'submission_snapshot_id',cycle.submission_snapshot_id,'issuer_role',membership.role,
      'case_version',current_case.version,'issued_at',now()),
    jsonb_build_object('provider_id',provider.id,'legal_name',provider.legal_name,
      'trading_name',provider.trading_name,'external_reference',provider.external_reference)
  ) returning * into created;
  update public.service_components set provider_id=provider.id,updated_at=now()
    where organisation_id=target_organisation_id and travel_case_id=target_case_id and id=any(requested_scope_component_ids);
  update public.travel_cases set status='authorised',current_dependency='provider',
    next_action='Obtain provider confirmation',version=version+1,updated_at=now()
    where organisation_id=target_organisation_id and id=target_case_id returning * into current_case;
  insert into public.case_events
    (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'authority_to_proceed.issued',
    previous_status,'authorised',jsonb_build_object('authority_to_proceed_id',created.id,
      'authority_number',created.authority_number,'approval_cycle_id',cycle.id,
      'provider_id',provider.id,'scope_component_ids',requested_scope_component_ids,
      'authorised_amount',authorised_amount,'currency',upper(currency),
      'valid_until',authority_valid_until,'case_version',current_case.version),correlation_id);
  return current_case;
end; $$;

revoke all on function public.create_organisation_provider(uuid,uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_organisation_provider(uuid,uuid,uuid,text,text,text,text) to service_role;
revoke all on function public.issue_authority_to_proceed(uuid,uuid,uuid,uuid,integer,uuid,uuid,uuid[],text,text,integer,timestamptz,text,numeric,numeric,text,text,text,text,text[],timestamptz,text) from public, anon, authenticated;
grant execute on function public.issue_authority_to_proceed(uuid,uuid,uuid,uuid,integer,uuid,uuid,uuid[],text,text,integer,timestamptz,text,numeric,numeric,text,text,text,text,text[],timestamptz,text) to service_role;

comment on table public.authorities_to_proceed is
  'Immutable operational authority evidence. It does not prove PO/LPO, payment, provider confirmation, booking, or ticketing.';
