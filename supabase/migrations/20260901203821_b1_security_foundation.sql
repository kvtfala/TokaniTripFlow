revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

revoke create on schema public from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

comment on schema app_private is
  'TripFlow server-only database objects. Not exposed through the Data API.';
