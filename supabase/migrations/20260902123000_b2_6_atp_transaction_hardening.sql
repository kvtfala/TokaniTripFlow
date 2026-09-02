-- Harden the live B2.6 transaction after adversarial review.
-- Fresh databases also receive the hardened definition in the base migration;
-- this replacement preserves the append-only migration history already applied.

create or replace function public.issue_authority_to_proceed(
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

revoke all on function public.issue_authority_to_proceed(uuid,uuid,uuid,uuid,integer,uuid,uuid,uuid[],text,text,integer,timestamptz,text,numeric,numeric,text,text,text,text,text[],timestamptz,text) from public, anon, authenticated;
grant execute on function public.issue_authority_to_proceed(uuid,uuid,uuid,uuid,integer,uuid,uuid,uuid[],text,text,integer,timestamptz,text,numeric,numeric,text,text,text,text,text[],timestamptz,text) to service_role;
