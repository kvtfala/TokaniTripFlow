CREATE TABLE "organisations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "timezone" varchar(100) NOT NULL DEFAULT 'Pacific/Fiji',
  "default_currency" varchar(3) NOT NULL DEFAULT 'FJD',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "organisation_memberships" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "role" varchar(50) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_organisation_membership_user" UNIQUE("organisation_id", "user_id")
);
CREATE INDEX "IDX_organisation_memberships_user" ON "organisation_memberships"("user_id");

CREATE TABLE "travel_cases" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "reference_number" varchar(50) NOT NULL,
  "legacy_request_id" varchar(100) UNIQUE,
  "traveller_user_id" varchar REFERENCES "users"("id"),
  "title" varchar(255) NOT NULL,
  "purpose" text NOT NULL,
  "status" varchar(40) NOT NULL DEFAULT 'draft',
  "priority" varchar(20) NOT NULL DEFAULT 'normal',
  "start_date" timestamp,
  "end_date" timestamp,
  "owner_membership_id" varchar REFERENCES "organisation_memberships"("id"),
  "submitted_at" timestamp,
  "closed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_travel_cases_org_reference" UNIQUE("organisation_id", "reference_number")
);
CREATE INDEX "IDX_travel_cases_org_status" ON "travel_cases"("organisation_id", "status");

CREATE TABLE "service_components" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "travel_case_id" varchar NOT NULL REFERENCES "travel_cases"("id"),
  "type" varchar(40) NOT NULL,
  "status" varchar(40) NOT NULL DEFAULT 'required',
  "sequence" integer NOT NULL DEFAULT 0,
  "requirements" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "provider_id" varchar REFERENCES "vendors"("id"),
  "provider_reference" varchar(100),
  "estimated_amount" numeric(12,2),
  "currency" varchar(3) NOT NULL DEFAULT 'FJD',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "IDX_service_components_org_case" ON "service_components"("organisation_id", "travel_case_id");

CREATE TABLE "case_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "travel_case_id" varchar NOT NULL REFERENCES "travel_cases"("id"),
  "actor_membership_id" varchar REFERENCES "organisation_memberships"("id"),
  "event_type" varchar(100) NOT NULL,
  "from_status" varchar(40),
  "to_status" varchar(40),
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "occurred_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "IDX_case_events_org_case_time" ON "case_events"("organisation_id", "travel_case_id", "occurred_at");
