alter table public.service_components add column idempotency_key uuid;
create unique index service_components_case_sequence on public.service_components (organisation_id, travel_case_id, sequence);
create unique index service_components_idempotency on public.service_components (organisation_id, travel_case_id, idempotency_key) where idempotency_key is not null;

drop function public.create_travel_case_draft(uuid,uuid,text,text,text,text,text,uuid,date,date,jsonb,jsonb,text[],text);
create function public.create_travel_case_draft(target_organisation_id uuid, actor_user_id uuid, actor_membership_id uuid, reference_number text, title text, purpose text, case_type text, priority text, traveller_user_id uuid, start_date date, end_date date, destination jsonb, funding jsonb, required_component_types text[], correlation_id text)
returns public.travel_cases language plpgsql security invoker set search_path = pg_catalog, public as $$
declare created public.travel_cases;
begin
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
    then raise exception using errcode = '42501', message = 'active_membership_required'; end if;
  if traveller_user_id is not null and not exists (select 1 from public.organisation_memberships m where m.organisation_id = target_organisation_id and m.user_id = traveller_user_id and m.status = 'active')
    then raise exception using errcode = '23514', message = 'traveller_membership_required'; end if;
  insert into public.travel_cases (organisation_id,reference_number,title,purpose,case_type,priority,traveller_user_id,start_date,end_date,destination,funding,required_component_types,owner_membership_id)
  values (target_organisation_id,reference_number,title,purpose,case_type,priority,traveller_user_id,start_date,end_date,destination,funding,coalesce(required_component_types,'{}'::text[]),actor_membership_id) returning * into created;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,payload,correlation_id)
  values (target_organisation_id,created.id,actor_membership_id,'case.draft_created',jsonb_build_object('version',created.version),correlation_id);
  return created;
end; $$;

create function public.update_travel_case_draft(target_organisation_id uuid, target_case_id uuid, actor_user_id uuid, actor_membership_id uuid, expected_version integer, patch jsonb, correlation_id text)
returns public.travel_cases language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; updated_case public.travel_cases; changed_fields text[];
begin
  if jsonb_typeof(patch) <> 'object' or patch = '{}'::jsonb then raise exception using errcode = '23514', message = 'empty_patch'; end if;
  if exists (select 1 from jsonb_object_keys(patch) as keys(field_name) where field_name not in ('title','purpose','caseType','priority','travellerUserId','startDate','endDate','destination','funding','requiredComponentTypes'))
    then raise exception using errcode = '23514', message = 'unknown_patch_field'; end if;
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
     or current_case.owner_membership_id <> actor_membership_id
    then raise exception using errcode = '42501', message = 'draft_edit_forbidden'; end if;
  if current_case.status <> 'draft' then raise exception using errcode = '55000', message = 'draft_status_required'; end if;
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
  values (target_organisation_id,target_case_id,actor_membership_id,'case.draft_updated',jsonb_build_object('from_version',expected_version,'to_version',updated_case.version,'changed_fields',changed_fields),correlation_id);
  return updated_case;
end; $$;

create function public.add_service_component(target_organisation_id uuid, target_case_id uuid, actor_user_id uuid, actor_membership_id uuid, expected_version integer, request_idempotency_key uuid, component_type text, component_sequence integer, requirements jsonb, correlation_id text)
returns public.service_components language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; existing_component public.service_components; created_component public.service_components;
begin
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active')
     or current_case.owner_membership_id <> actor_membership_id
    then raise exception using errcode = '42501', message = 'draft_edit_forbidden'; end if;
  select * into existing_component from public.service_components sc
  where sc.organisation_id = target_organisation_id and sc.travel_case_id = target_case_id and sc.idempotency_key = request_idempotency_key;
  if found then return existing_component; end if;
  if current_case.status <> 'draft' then raise exception using errcode = '55000', message = 'draft_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  insert into public.service_components (organisation_id,travel_case_id,type,sequence,requirements,idempotency_key)
  values (target_organisation_id,target_case_id,component_type,component_sequence,requirements,request_idempotency_key) returning * into created_component;
  update public.travel_cases set version = version + 1, updated_at = now() where organisation_id = target_organisation_id and id = target_case_id;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'component.added',jsonb_build_object('component_id',created_component.id,'type',created_component.type,'from_version',expected_version,'to_version',expected_version + 1),correlation_id);
  return created_component;
end; $$;

revoke all on function public.create_travel_case_draft(uuid,uuid,uuid,text,text,text,text,text,uuid,date,date,jsonb,jsonb,text[],text) from public, anon, authenticated;
grant execute on function public.create_travel_case_draft(uuid,uuid,uuid,text,text,text,text,text,uuid,date,date,jsonb,jsonb,text[],text) to service_role;
revoke all on function public.update_travel_case_draft(uuid,uuid,uuid,uuid,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.update_travel_case_draft(uuid,uuid,uuid,uuid,integer,jsonb,text) to service_role;
revoke all on function public.add_service_component(uuid,uuid,uuid,uuid,integer,uuid,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.add_service_component(uuid,uuid,uuid,uuid,integer,uuid,text,integer,jsonb,text) to service_role;
