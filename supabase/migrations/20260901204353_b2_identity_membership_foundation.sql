create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 160),
  time_zone text not null default 'Pacific/Fiji' check (char_length(time_zone) between 1 and 100),
  locale text not null default 'en' check (char_length(locale) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name text not null check (char_length(name) between 2 and 200),
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  time_zone text not null default 'Pacific/Fiji' check (char_length(time_zone) between 1 and 100),
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'employee', 'coordinator', 'approver', 'manager', 'finance_admin',
    'travel_desk', 'travel_admin', 'organisation_admin'
  )),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended', 'revoked')),
  invited_by_membership_id uuid references public.organisation_memberships(id) on delete set null,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id),
  unique (organisation_id, id),
  check ((status = 'active') = (activated_at is not null and revoked_at is null)
    or status in ('invited', 'suspended', 'revoked')),
  check (status <> 'revoked' or revoked_at is not null)
);

create table public.organisation_invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 320),
  role text not null check (role in (
    'employee', 'coordinator', 'approver', 'manager', 'finance_admin',
    'travel_desk', 'travel_admin', 'organisation_admin'
  )),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by_membership_id uuid not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invitation_inviter_same_org
    foreign key (organisation_id, invited_by_membership_id)
    references public.organisation_memberships(organisation_id, id),
  check (expires_at > created_at),
  check ((status = 'accepted') = (accepted_at is not null and accepted_by_user_id is not null)
    or status in ('pending', 'expired', 'revoked'))
);

create unique index organisation_invitations_one_pending_email
  on public.organisation_invitations (organisation_id, lower(email))
  where status = 'pending';

create table public.identity_audit_events (
  id bigint generated always as identity primary key,
  organisation_id uuid references public.organisations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_membership_id uuid references public.organisation_memberships(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 100),
  correlation_id text not null check (char_length(correlation_id) between 8 and 128),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now()
);

create index organisation_memberships_user_active
  on public.organisation_memberships (user_id, organisation_id)
  where status = 'active';
create index organisation_memberships_org_status
  on public.organisation_memberships (organisation_id, status);
create index organisation_invitations_org_status
  on public.organisation_invitations (organisation_id, status);
create index organisation_invitations_expiry_pending
  on public.organisation_invitations (expires_at)
  where status = 'pending';
create index identity_audit_events_org_time
  on public.identity_audit_events (organisation_id, occurred_at desc);
create index identity_audit_events_subject_time
  on public.identity_audit_events (subject_user_id, occurred_at desc);

create function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function app_private.set_updated_at();
create trigger organisations_set_updated_at
before update on public.organisations
for each row execute function app_private.set_updated_at();
create trigger organisation_memberships_set_updated_at
before update on public.organisation_memberships
for each row execute function app_private.set_updated_at();

create function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'TripFlow user'
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function app_private.handle_new_auth_user() from public, anon, authenticated;

create trigger tripflow_auth_user_profile
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

create function app_private.is_active_member(target_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.organisation_memberships membership
    join public.organisations organisation
      on organisation.id = membership.organisation_id
    where membership.organisation_id = target_organisation_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and organisation.status = 'active'
  );
$$;

revoke all on function app_private.is_active_member(uuid) from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_active_member(uuid) to authenticated;

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.organisations enable row level security;
alter table public.organisations force row level security;
alter table public.organisation_memberships enable row level security;
alter table public.organisation_memberships force row level security;
alter table public.organisation_invitations enable row level security;
alter table public.organisation_invitations force row level security;
alter table public.identity_audit_events enable row level security;
alter table public.identity_audit_events force row level security;

create policy user_profiles_select_self
on public.user_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_profiles_update_self
on public.user_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy organisations_select_active_membership
on public.organisations for select
to authenticated
using ((select app_private.is_active_member(id)));

create policy memberships_select_self
on public.organisation_memberships for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.organisations from anon, authenticated;
revoke all on table public.organisation_memberships from anon, authenticated;
revoke all on table public.organisation_invitations from anon, authenticated;
revoke all on table public.identity_audit_events from anon, authenticated;

grant select on table public.user_profiles to authenticated;
grant update (display_name, time_zone, locale) on table public.user_profiles to authenticated;
grant select on table public.organisations to authenticated;
grant select on table public.organisation_memberships to authenticated;

comment on table public.organisation_invitations is
  'Server-managed invitation records. Raw invitation tokens are never stored.';
comment on table public.identity_audit_events is
  'Append-only server-managed identity and membership security events.';
