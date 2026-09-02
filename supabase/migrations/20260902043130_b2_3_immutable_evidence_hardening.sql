create function app_private.reject_immutable_change()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  raise exception using errcode = '55000', message = 'immutable_evidence_cannot_be_changed';
end; $$;
revoke all on function app_private.reject_immutable_change() from public, anon, authenticated;

create trigger case_events_immutable
before update or delete on public.case_events
for each row execute function app_private.reject_immutable_change();

create trigger submission_snapshots_immutable
before update or delete on public.travel_case_submission_snapshots
for each row execute function app_private.reject_immutable_change();
