-- Idempotent backfill from the demonstration model into the Phase 0 core.
-- Run only after 0001_phase0_production_core.sql.

INSERT INTO organisations (name, code, timezone, default_currency)
SELECT cs.display_name, cs.company_code, COALESCE(cs.timezone, 'Pacific/Fiji'), 'FJD'
  FROM company_settings cs
 WHERE cs.company_code IS NOT NULL
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      timezone = EXCLUDED.timezone,
      updated_at = now();

INSERT INTO organisation_memberships (organisation_id, user_id, role, is_active)
SELECT o.id,
       u.id,
       CASE
         WHEN u.role IN ('employee','coordinator','approver','manager','finance_admin','travel_desk','travel_admin')
           THEN u.role
         WHEN u.role = 'super_admin' THEN 'organisation_admin'
         ELSE 'employee'
       END,
       u.is_active
  FROM users u
  JOIN organisations o ON o.code = u.company_code
 WHERE u.company_code IS NOT NULL
ON CONFLICT (organisation_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      updated_at = now();

INSERT INTO travel_cases (
  organisation_id, reference_number, legacy_request_id, traveller_user_id,
  title, purpose, status, priority, start_date, end_date, submitted_at
)
SELECT o.id,
       COALESCE(tr.ttr_number, 'LEGACY-' || tr.id),
       tr.id,
       CASE WHEN u.id IS NULL THEN NULL ELSE tr.employee_id END,
       LEFT(tr.employee_name || ' — ' || COALESCE(tr.destination->>'city', 'Travel'), 255),
       tr.purpose,
       CASE tr.status
         WHEN 'draft' THEN 'draft'
         WHEN 'pending' THEN 'draft'
         WHEN 'submitted' THEN 'submitted'
         WHEN 'in_review' THEN 'in_review'
         WHEN 'awaiting_quotes' THEN 'in_review'
         WHEN 'quotes_submitted' THEN 'in_review'
         WHEN 'approved' THEN 'authorised'
         WHEN 'ticketed' THEN 'ready_to_travel'
         WHEN 'rejected' THEN 'cancelled'
         ELSE 'draft'
       END,
       COALESCE(tr.ttc_priority, 'normal'),
       NULLIF(tr.start_date, '')::timestamp,
       NULLIF(tr.end_date, '')::timestamp,
       tr.submitted_at
  FROM travel_requests tr
  JOIN organisations o ON o.code = tr.company_code
  LEFT JOIN users u ON u.id = tr.employee_id
ON CONFLICT (legacy_request_id) DO UPDATE
  SET title = EXCLUDED.title,
      purpose = EXCLUDED.purpose,
      priority = EXCLUDED.priority,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      updated_at = now();

INSERT INTO service_components (organisation_id, travel_case_id, type, sequence, requirements)
SELECT tc.organisation_id, tc.id, component.type, component.sequence, '{}'::jsonb
  FROM travel_cases tc
  JOIN travel_requests tr ON tr.id = tc.legacy_request_id
 CROSS JOIN LATERAL (
   VALUES
     ('flight', 10, tr.needs_flights),
     ('accommodation', 20, tr.needs_accommodation),
     ('visa', 30, tr.needs_visa),
     ('ground_transport', 40, tr.needs_transport)
 ) AS component(type, sequence, required)
 WHERE component.required = true
   AND NOT EXISTS (
     SELECT 1
       FROM service_components sc
      WHERE sc.travel_case_id = tc.id
        AND sc.type = component.type
   );

INSERT INTO case_events (
  organisation_id, travel_case_id, event_type, from_status, to_status, payload, occurred_at
)
SELECT tc.organisation_id,
       tc.id,
       COALESCE(history.item->>'action', 'LEGACY_EVENT'),
       NULL,
       NULL,
       history.item,
       COALESCE(NULLIF(history.item->>'ts', '')::timestamp, tc.created_at)
  FROM travel_cases tc
 CROSS JOIN LATERAL jsonb_array_elements(
   COALESCE((SELECT tr.history FROM travel_requests tr WHERE tr.id = tc.legacy_request_id), '[]'::jsonb)
 ) WITH ORDINALITY AS history(item, ordinal)
 WHERE NOT EXISTS (
   SELECT 1 FROM case_events ce
    WHERE ce.travel_case_id = tc.id
      AND ce.event_type = COALESCE(history.item->>'action', 'LEGACY_EVENT')
      AND ce.occurred_at = COALESCE(NULLIF(history.item->>'ts', '')::timestamp, tc.created_at)
 );

-- Stop rather than silently accepting an incomplete tenant or case backfill.
DO $$
DECLARE
  legacy_tenants integer;
  migrated_tenants integer;
  legacy_cases integer;
  migrated_cases integer;
  orphan_components integer;
  orphan_events integer;
BEGIN
  SELECT count(DISTINCT company_code) INTO legacy_tenants
    FROM travel_requests WHERE company_code IS NOT NULL;
  SELECT count(*) INTO migrated_tenants FROM organisations;
  IF migrated_tenants < legacy_tenants THEN
    RAISE EXCEPTION 'Phase 0 tenant reconciliation failed: expected at least %, found %', legacy_tenants, migrated_tenants;
  END IF;

  SELECT count(*) INTO legacy_cases
    FROM travel_requests WHERE company_code IS NOT NULL;
  SELECT count(*) INTO migrated_cases
    FROM travel_cases WHERE legacy_request_id IS NOT NULL;
  IF migrated_cases <> legacy_cases THEN
    RAISE EXCEPTION 'Phase 0 case reconciliation failed: expected %, found %', legacy_cases, migrated_cases;
  END IF;

  SELECT count(*) INTO orphan_components
    FROM service_components sc
    LEFT JOIN travel_cases tc
      ON tc.id = sc.travel_case_id AND tc.organisation_id = sc.organisation_id
   WHERE tc.id IS NULL;
  SELECT count(*) INTO orphan_events
    FROM case_events ce
    LEFT JOIN travel_cases tc
      ON tc.id = ce.travel_case_id AND tc.organisation_id = ce.organisation_id
   WHERE tc.id IS NULL;
  IF orphan_components > 0 OR orphan_events > 0 THEN
    RAISE EXCEPTION 'Phase 0 ownership reconciliation failed: % component and % event orphans', orphan_components, orphan_events;
  END IF;
END $$;

