alter table public.travel_cases drop constraint travel_cases_status_check;
alter table public.travel_cases add constraint travel_cases_status_check
  check (status in ('draft','submitted','in_review','authorised','coordinating','ready_to_travel','in_travel','completed','cancelled'));
alter table public.service_components drop constraint service_components_type_check;
alter table public.service_components add constraint service_components_type_check
  check (type in ('flight','accommodation','transfer','ground_transport','visa','venue','insurance','other'));
