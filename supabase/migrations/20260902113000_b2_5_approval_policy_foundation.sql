-- B2.5 approval and policy-evaluation foundation.
-- Approval is distinct from review and from Authority to Proceed.

alter table public.travel_cases drop constraint travel_cases_status_check;
alter table public.travel_cases add constraint travel_cases_status_check
  check (status in ('draft','submitted','in_review','information_required','awaiting_approval','approved','authorised','coordinating','ready_to_travel','in_travel','completed','cancelled'));

create table public.organisation_approval_policies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  version integer not null check (version > 0),
  self_approval_allowed boolean not null default false,
  stages jsonb not null check (jsonb_typeof(stages) = 'array' and jsonb_array_length(stages) between 1 and 20),
  effective_from timestamptz not null default now(),
  created_by_membership_id uuid references public.organisation_memberships(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organisation_id, version),
  unique (organisation_id, id),
  foreign key (organisation_id, created_by_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict
);
create index approval_policies_effective on public.organisation_approval_policies (organisation_id, effective_from desc, version desc);

create table public.travel_case_review_outcomes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  submission_snapshot_id uuid not null references public.travel_case_submission_snapshots(id) on delete restrict,
  review_assignment_id uuid not null references public.travel_case_review_assignments(id) on delete restrict,
  reviewed_by_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  approval_policy_id uuid not null references public.organisation_approval_policies(id) on delete restrict,
  idempotency_key uuid not null,
  outcome text not null check (outcome in ('ready_for_approval')),
  policy_evaluation jsonb not null check (jsonb_typeof(policy_evaluation) = 'object'),
  notes text check (notes is null or char_length(notes) between 1 and 4000),
  reviewed_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  foreign key (organisation_id, reviewed_by_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  foreign key (organisation_id, approval_policy_id) references public.organisation_approval_policies(organisation_id, id) on delete restrict,
  unique (organisation_id, travel_case_id, idempotency_key),
  unique (submission_snapshot_id)
);

create table public.approval_cycles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  submission_snapshot_id uuid not null references public.travel_case_submission_snapshots(id) on delete restrict,
  review_outcome_id uuid not null unique references public.travel_case_review_outcomes(id) on delete restrict,
  policy_id uuid not null references public.organisation_approval_policies(id) on delete restrict,
  policy_snapshot jsonb not null check (jsonb_typeof(policy_snapshot) = 'object'),
  cycle_number integer not null check (cycle_number > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','returned','superseded')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  foreign key (organisation_id, policy_id) references public.organisation_approval_policies(organisation_id, id) on delete restrict,
  unique (organisation_id, travel_case_id, cycle_number),
  unique (submission_snapshot_id)
);

create table public.approval_requirements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  approval_cycle_id uuid not null references public.approval_cycles(id) on delete restrict,
  stage_sequence integer not null check (stage_sequence between 1 and 20),
  subject text not null check (subject in ('business_need','funding','policy_exception','provider_selection','material_change')),
  subject_version jsonb not null check (jsonb_typeof(subject_version) = 'object'),
  required_role text not null check (required_role in ('approver','manager','finance_admin')),
  assigned_membership_id uuid references public.organisation_memberships(id) on delete restrict,
  minimum_decisions integer not null default 1 check (minimum_decisions between 1 and 10),
  amount numeric(18,2) check (amount is null or amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected','returned','superseded')),
  created_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  foreign key (organisation_id, assigned_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  unique (approval_cycle_id, stage_sequence, subject)
);

create table public.approval_delegations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  delegator_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  delegate_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  role_scope text not null check (role_scope in ('approver','manager','finance_admin')),
  amount_limit numeric(18,2) check (amount_limit is null or amount_limit >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  created_by_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by_membership_id uuid references public.organisation_memberships(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organisation_id, delegator_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  foreign key (organisation_id, delegate_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  foreign key (organisation_id, created_by_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  foreign key (organisation_id, revoked_by_membership_id) references public.organisation_memberships(organisation_id, id) on delete restrict,
  check (delegator_membership_id <> delegate_membership_id),
  check (valid_until > valid_from),
  check ((revoked_at is null) = (revoked_by_membership_id is null))
);

create table public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  travel_case_id uuid not null,
  approval_cycle_id uuid not null references public.approval_cycles(id) on delete restrict,
  approval_requirement_id uuid not null references public.approval_requirements(id) on delete restrict,
  actor_membership_id uuid not null references public.organisation_memberships(id) on delete restrict,
  delegation_id uuid references public.approval_delegations(id) on delete restrict,
  idempotency_key uuid not null,
  decision text not null check (decision in ('approve','reject','return_for_information')),
  reason text not null check (char_length(reason) between 3 and 4000),
  authority_evidence jsonb not null check (jsonb_typeof(authority_evidence) = 'object'),
  subject_version jsonb not null check (jsonb_typeof(subject_version) = 'object'),
  decided_at timestamptz not null default now(),
  foreign key (organisation_id, travel_case_id) references public.travel_cases(organisation_id, id) on delete restrict,
  unique (organisation_id, travel_case_id, idempotency_key),
  unique (approval_requirement_id, actor_membership_id)
);

create index review_outcomes_case_time on public.travel_case_review_outcomes (organisation_id, travel_case_id, reviewed_at desc);
create index approval_cycles_case_number on public.approval_cycles (organisation_id, travel_case_id, cycle_number desc);
create index approval_requirements_pending_role on public.approval_requirements (organisation_id, required_role, stage_sequence) where status = 'pending';
create index approval_requirements_assignee on public.approval_requirements (assigned_membership_id) where assigned_membership_id is not null;
create index approval_delegations_delegate_active on public.approval_delegations (organisation_id, delegate_membership_id, valid_from, valid_until) where revoked_at is null;
create index approval_decisions_requirement_time on public.approval_decisions (approval_requirement_id, decided_at);

alter table public.organisation_approval_policies enable row level security;
alter table public.organisation_approval_policies force row level security;
alter table public.travel_case_review_outcomes enable row level security;
alter table public.travel_case_review_outcomes force row level security;
alter table public.approval_cycles enable row level security;
alter table public.approval_cycles force row level security;
alter table public.approval_requirements enable row level security;
alter table public.approval_requirements force row level security;
alter table public.approval_delegations enable row level security;
alter table public.approval_delegations force row level security;
alter table public.approval_decisions enable row level security;
alter table public.approval_decisions force row level security;

revoke all on table public.organisation_approval_policies, public.travel_case_review_outcomes,
  public.approval_cycles, public.approval_requirements, public.approval_delegations,
  public.approval_decisions from public, anon, authenticated;
create policy approval_policies_server_only on public.organisation_approval_policies for all to anon, authenticated using (false) with check (false);
create policy review_outcomes_server_only on public.travel_case_review_outcomes for all to anon, authenticated using (false) with check (false);
create policy approval_cycles_server_only on public.approval_cycles for all to anon, authenticated using (false) with check (false);
create policy approval_requirements_server_only on public.approval_requirements for all to anon, authenticated using (false) with check (false);
create policy approval_delegations_server_only on public.approval_delegations for all to anon, authenticated using (false) with check (false);
create policy approval_decisions_server_only on public.approval_decisions for all to anon, authenticated using (false) with check (false);

create trigger approval_policies_immutable before update or delete on public.organisation_approval_policies
  for each row execute function app_private.reject_immutable_change();
create trigger review_outcomes_immutable before update or delete on public.travel_case_review_outcomes
  for each row execute function app_private.reject_immutable_change();
create trigger approval_decisions_immutable before update or delete on public.approval_decisions
  for each row execute function app_private.reject_immutable_change();

-- Seed a conservative one-stage policy. Future policy changes create a new version.
insert into public.organisation_approval_policies (organisation_id, version, stages)
select id, 1, '[{"sequence":1,"subject":"business_need","required_role":"approver","minimum_decisions":1}]'::jsonb
from public.organisations;

create function app_private.seed_default_approval_policy()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  insert into public.organisation_approval_policies (organisation_id, version, stages)
  values (new.id, 1, '[{"sequence":1,"subject":"business_need","required_role":"approver","minimum_decisions":1}]'::jsonb);
  return new;
end; $$;
revoke all on function app_private.seed_default_approval_policy() from public, anon, authenticated;
create trigger organisations_seed_default_approval_policy after insert on public.organisations
  for each row execute function app_private.seed_default_approval_policy();

create function public.complete_travel_case_review(
  target_organisation_id uuid, target_case_id uuid, actor_user_id uuid,
  actor_membership_id uuid, expected_version integer, request_idempotency_key uuid,
  policy_evaluation jsonb, review_notes text, correlation_id text
) returns public.travel_cases language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; assignment public.travel_case_review_assignments;
  latest_snapshot public.travel_case_submission_snapshots; policy_record public.organisation_approval_policies;
  existing_outcome public.travel_case_review_outcomes; created_outcome public.travel_case_review_outcomes;
  created_cycle public.approval_cycles; stage jsonb; next_cycle integer;
begin
  select * into current_case from public.travel_cases where organisation_id = target_organisation_id and id = target_case_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'travel_case_not_found'; end if;
  if not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.user_id = actor_user_id and m.organisation_id = target_organisation_id and m.status = 'active' and m.role in ('coordinator','travel_desk','travel_admin')) then
    raise exception using errcode = '42501', message = 'review_forbidden'; end if;
  select * into existing_outcome from public.travel_case_review_outcomes o where o.organisation_id = target_organisation_id and o.travel_case_id = target_case_id and o.idempotency_key = request_idempotency_key;
  if found then return current_case; end if;
  if current_case.status <> 'in_review' then raise exception using errcode = '55000', message = 'review_status_required'; end if;
  if current_case.version <> expected_version then raise exception using errcode = '40001', message = 'version_conflict'; end if;
  select * into assignment from public.travel_case_review_assignments a where a.organisation_id = target_organisation_id and a.travel_case_id = target_case_id and a.released_at is null;
  if not found or (assignment.coordinator_membership_id <> actor_membership_id and not exists (select 1 from public.organisation_memberships m where m.id = actor_membership_id and m.organisation_id = target_organisation_id and m.role = 'travel_admin' and m.status = 'active')) then
    raise exception using errcode = '42501', message = 'review_assignment_required'; end if;
  select * into latest_snapshot from public.travel_case_submission_snapshots s where s.organisation_id = target_organisation_id and s.travel_case_id = target_case_id order by s.submission_number desc limit 1;
  if not found then raise exception using errcode = '55000', message = 'submission_snapshot_required'; end if;
  if policy_evaluation is null or jsonb_typeof(policy_evaluation) <> 'object' then raise exception using errcode = '23514', message = 'policy_evaluation_required'; end if;
  select * into policy_record from public.organisation_approval_policies p where p.organisation_id = target_organisation_id and p.effective_from <= now() order by p.effective_from desc, p.version desc limit 1;
  if not found then raise exception using errcode = '55000', message = 'approval_policy_required'; end if;
  insert into public.travel_case_review_outcomes (organisation_id,travel_case_id,submission_snapshot_id,review_assignment_id,reviewed_by_membership_id,approval_policy_id,idempotency_key,outcome,policy_evaluation,notes)
  values (target_organisation_id,target_case_id,latest_snapshot.id,assignment.id,actor_membership_id,policy_record.id,request_idempotency_key,'ready_for_approval',policy_evaluation,review_notes) returning * into created_outcome;
  select coalesce(max(cycle_number),0)+1 into next_cycle from public.approval_cycles where organisation_id=target_organisation_id and travel_case_id=target_case_id;
  insert into public.approval_cycles (organisation_id,travel_case_id,submission_snapshot_id,review_outcome_id,policy_id,policy_snapshot,cycle_number)
  values (target_organisation_id,target_case_id,latest_snapshot.id,created_outcome.id,policy_record.id,jsonb_build_object('policy_version',policy_record.version,'self_approval_allowed',policy_record.self_approval_allowed,'stages',policy_record.stages),next_cycle) returning * into created_cycle;
  for stage in select value from jsonb_array_elements(policy_record.stages) loop
    if not ((stage ? 'sequence') and (stage ? 'subject') and (stage ? 'required_role')) then raise exception using errcode='23514', message='invalid_approval_policy_stage'; end if;
    insert into public.approval_requirements (organisation_id,travel_case_id,approval_cycle_id,stage_sequence,subject,subject_version,required_role,minimum_decisions,amount,currency)
    values (target_organisation_id,target_case_id,created_cycle.id,(stage->>'sequence')::integer,stage->>'subject',jsonb_build_object('submission_snapshot_id',latest_snapshot.id,'submission_number',latest_snapshot.submission_number),stage->>'required_role',coalesce((stage->>'minimum_decisions')::integer,1),nullif(stage->>'amount','')::numeric,nullif(stage->>'currency',''));
  end loop;
  update public.travel_cases set status='awaiting_approval',current_dependency='approver',next_action='Complete required approvals',version=version+1,updated_at=now() where organisation_id=target_organisation_id and id=target_case_id returning * into current_case;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'review.completed','in_review','awaiting_approval',jsonb_build_object('review_outcome_id',created_outcome.id,'approval_cycle_id',created_cycle.id,'submission_snapshot_id',latest_snapshot.id,'policy_version',policy_record.version,'from_version',expected_version,'to_version',current_case.version),correlation_id);
  return current_case;
end; $$;

create function public.record_approval_decision(
  target_organisation_id uuid, target_case_id uuid, target_requirement_id uuid,
  actor_user_id uuid, actor_membership_id uuid, request_idempotency_key uuid,
  requested_decision text, decision_reason text, correlation_id text
) returns public.travel_cases language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare current_case public.travel_cases; requirement public.approval_requirements; cycle public.approval_cycles;
  membership public.organisation_memberships; delegation public.approval_delegations; policy_allows_self boolean;
  approved_count integer; next_pending integer; existing_decision public.approval_decisions;
begin
  select * into current_case from public.travel_cases where organisation_id=target_organisation_id and id=target_case_id for update;
  if not found then raise exception using errcode='P0002', message='travel_case_not_found'; end if;
  select * into existing_decision from public.approval_decisions d where d.organisation_id=target_organisation_id and d.travel_case_id=target_case_id and d.idempotency_key=request_idempotency_key;
  if found then return current_case; end if;
  if current_case.status <> 'awaiting_approval' then raise exception using errcode='55000', message='approval_status_required'; end if;
  if requested_decision not in ('approve','reject','return_for_information') then raise exception using errcode='23514', message='invalid_approval_decision'; end if;
  select * into requirement from public.approval_requirements r where r.id=target_requirement_id and r.organisation_id=target_organisation_id and r.travel_case_id=target_case_id and r.status='pending';
  if not found then raise exception using errcode='P0002', message='approval_requirement_not_found'; end if;
  select * into cycle from public.approval_cycles c where c.id=requirement.approval_cycle_id and c.status='pending' for update;
  if not found then raise exception using errcode='55000', message='approval_cycle_not_pending'; end if;
  if exists (select 1 from public.approval_requirements r where r.approval_cycle_id=cycle.id and r.stage_sequence < requirement.stage_sequence and r.status <> 'approved') then raise exception using errcode='55000', message='prior_approval_stage_required'; end if;
  select * into membership from public.organisation_memberships m where m.id=actor_membership_id and m.user_id=actor_user_id and m.organisation_id=target_organisation_id and m.status='active';
  if not found then raise exception using errcode='42501', message='approval_forbidden'; end if;
  if requirement.assigned_membership_id is not null and requirement.assigned_membership_id <> actor_membership_id then raise exception using errcode='42501', message='approval_forbidden'; end if;
  if membership.role <> requirement.required_role then
    select d.* into delegation from public.approval_delegations d join public.organisation_memberships dm on dm.id=d.delegator_membership_id
    where d.organisation_id=target_organisation_id and d.delegate_membership_id=actor_membership_id and d.role_scope=requirement.required_role and d.revoked_at is null and now() between d.valid_from and d.valid_until and dm.status='active' and dm.role=requirement.required_role and (requirement.amount is null or (d.amount_limit is not null and d.amount_limit >= requirement.amount and d.currency=requirement.currency)) order by d.valid_until limit 1;
    if not found then raise exception using errcode='42501', message='approval_authority_required'; end if;
  end if;
  policy_allows_self := coalesce((cycle.policy_snapshot->>'self_approval_allowed')::boolean,false);
  if not policy_allows_self and (current_case.owner_membership_id=actor_membership_id or current_case.traveller_user_id=actor_user_id or exists (select 1 from public.travel_case_review_outcomes o where o.id=cycle.review_outcome_id and o.reviewed_by_membership_id=actor_membership_id)) then raise exception using errcode='42501', message='self_approval_forbidden'; end if;
  insert into public.approval_decisions (organisation_id,travel_case_id,approval_cycle_id,approval_requirement_id,actor_membership_id,delegation_id,idempotency_key,decision,reason,authority_evidence,subject_version)
  values (target_organisation_id,target_case_id,cycle.id,requirement.id,actor_membership_id,delegation.id,request_idempotency_key,requested_decision,decision_reason,jsonb_build_object('actor_role',membership.role,'required_role',requirement.required_role,'delegation_id',delegation.id,'evaluated_at',now()),requirement.subject_version);
  if requested_decision='approve' then
    select count(*) into approved_count from public.approval_decisions d where d.approval_requirement_id=requirement.id and d.decision='approve';
    if approved_count >= requirement.minimum_decisions then update public.approval_requirements set status='approved' where id=requirement.id; end if;
    select count(*) into next_pending from public.approval_requirements r where r.approval_cycle_id=cycle.id and r.status='pending';
    if next_pending=0 then
      update public.approval_cycles set status='approved',completed_at=now() where id=cycle.id;
      update public.travel_cases set status='approved',current_dependency=null,next_action='Issue Authority to Proceed',version=version+1,updated_at=now() where id=current_case.id returning * into current_case;
    end if;
  elsif requested_decision='reject' then
    update public.approval_requirements set status='rejected' where id=requirement.id;
    update public.approval_cycles set status='rejected',completed_at=now() where id=cycle.id;
    update public.travel_cases set status='in_review',current_dependency='coordinator',next_action='Resolve rejection or cancel case',version=version+1,updated_at=now() where id=current_case.id returning * into current_case;
  else
    update public.approval_requirements set status='returned' where id=requirement.id;
    update public.approval_cycles set status='returned',completed_at=now() where id=cycle.id;
    update public.travel_cases set status='information_required',current_dependency='requester',next_action='Respond to approval information request',version=version+1,updated_at=now() where id=current_case.id returning * into current_case;
  end if;
  insert into public.case_events (organisation_id,travel_case_id,actor_membership_id,event_type,from_status,to_status,payload,correlation_id)
  values (target_organisation_id,target_case_id,actor_membership_id,'approval.decision_recorded','awaiting_approval',current_case.status,jsonb_build_object('approval_cycle_id',cycle.id,'requirement_id',requirement.id,'decision',requested_decision,'delegation_id',delegation.id,'case_version',current_case.version),correlation_id);
  return current_case;
end; $$;

revoke all on function public.complete_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.complete_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,jsonb,text,text) to service_role;
revoke all on function public.record_approval_decision(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_approval_decision(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text) to service_role;

comment on table public.approval_decisions is 'Append-only human decisions tied to an immutable subject version and authority evidence.';
comment on table public.approval_delegations is 'Time-bounded delegated approval authority; creation and revocation require separate audited administration commands.';
