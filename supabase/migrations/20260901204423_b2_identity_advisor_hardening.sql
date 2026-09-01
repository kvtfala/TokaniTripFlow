create policy organisation_invitations_deny_client
on public.organisation_invitations for all
to authenticated
using (false)
with check (false);

create policy identity_audit_events_deny_client
on public.identity_audit_events for all
to authenticated
using (false)
with check (false);

create index organisation_memberships_inviter
  on public.organisation_memberships (invited_by_membership_id)
  where invited_by_membership_id is not null;
create index organisation_invitations_inviter
  on public.organisation_invitations (organisation_id, invited_by_membership_id);
create index organisation_invitations_accepted_user
  on public.organisation_invitations (accepted_by_user_id)
  where accepted_by_user_id is not null;
create index identity_audit_events_actor_user
  on public.identity_audit_events (actor_user_id)
  where actor_user_id is not null;
create index identity_audit_events_actor_membership
  on public.identity_audit_events (actor_membership_id)
  where actor_membership_id is not null;
