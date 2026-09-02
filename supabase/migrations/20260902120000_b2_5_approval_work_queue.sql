create function public.list_pending_approval_work(
  target_organisation_id uuid, actor_user_id uuid, actor_membership_id uuid
) returns table (
  requirement_id uuid, travel_case_id uuid, reference_number text, title text,
  stage_sequence integer, subject text, required_role text, due_at timestamptz,
  submission_snapshot_id uuid, subject_version jsonb
) language plpgsql stable security invoker set search_path = pg_catalog, public as $$
declare actor_role text;
begin
  select m.role into actor_role from public.organisation_memberships m
  join public.organisations o on o.id=m.organisation_id
  where m.id=actor_membership_id and m.user_id=actor_user_id
    and m.organisation_id=target_organisation_id and m.status='active' and o.status='active';
  if not found or actor_role not in ('approver','manager','finance_admin') then
    raise exception using errcode='42501', message='approval_forbidden';
  end if;
  return query
  select r.id,c.id,c.reference_number,c.title,r.stage_sequence,r.subject,r.required_role,r.due_at,
    cy.submission_snapshot_id,r.subject_version
  from public.approval_requirements r
  join public.approval_cycles cy on cy.id=r.approval_cycle_id and cy.status='pending'
  join public.travel_cases c on c.id=r.travel_case_id and c.organisation_id=r.organisation_id
  where r.organisation_id=target_organisation_id and r.status='pending'
    and not exists (select 1 from public.approval_requirements prior where prior.approval_cycle_id=r.approval_cycle_id and prior.stage_sequence<r.stage_sequence and prior.status<>'approved')
    and (r.assigned_membership_id is null or r.assigned_membership_id=actor_membership_id)
    and (r.required_role=actor_role or exists (
      select 1 from public.approval_delegations d
      join public.organisation_memberships dm on dm.id=d.delegator_membership_id
      where d.organisation_id=target_organisation_id and d.delegate_membership_id=actor_membership_id
        and d.role_scope=r.required_role and d.revoked_at is null and now() between d.valid_from and d.valid_until
        and dm.status='active' and dm.role=r.required_role
        and (r.amount is null or (d.amount_limit is not null and d.amount_limit>=r.amount and d.currency=r.currency))
    ))
  order by r.due_at nulls last, c.updated_at, r.stage_sequence;
end; $$;

revoke all on function public.list_pending_approval_work(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.list_pending_approval_work(uuid,uuid,uuid) to service_role;
