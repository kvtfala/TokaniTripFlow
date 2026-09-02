-- Preserve the approved separation between tenant administration and
-- operational travel-case access.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.claim_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,text)'::regprocedure)
    into definition;
  execute replace(
    definition,
    $replace$('coordinator','travel_desk','travel_admin','organisation_admin')$replace$,
    $replace$('coordinator','travel_desk','travel_admin')$replace$
  );

  select pg_get_functiondef('public.request_travel_case_information(uuid,uuid,uuid,uuid,integer,uuid,text,text[],date,text)'::regprocedure)
    into definition;
  definition := replace(
    definition,
    $replace$('coordinator','travel_desk','travel_admin','organisation_admin')$replace$,
    $replace$('coordinator','travel_desk','travel_admin')$replace$
  );
  definition := replace(
    definition,
    $replace$m.role in ('travel_admin','organisation_admin')$replace$,
    $replace$m.role = 'travel_admin'$replace$
  );
  execute definition;
end $$;

revoke all on function public.claim_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,text)
  from public, anon, authenticated;
grant execute on function public.claim_travel_case_review(uuid,uuid,uuid,uuid,integer,uuid,text)
  to service_role;
revoke all on function public.request_travel_case_information(uuid,uuid,uuid,uuid,integer,uuid,text,text[],date,text)
  from public, anon, authenticated;
grant execute on function public.request_travel_case_information(uuid,uuid,uuid,uuid,integer,uuid,text,text[],date,text)
  to service_role;
