CREATE TABLE "approval_decisions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "travel_case_id" varchar NOT NULL REFERENCES "travel_cases"("id"),
  "sequence" integer NOT NULL,
  "approver_membership_id" varchar NOT NULL REFERENCES "organisation_memberships"("id"),
  "status" varchar(30) NOT NULL DEFAULT 'pending',
  "comment" text,
  "decided_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_approval_case_sequence" UNIQUE("travel_case_id", "sequence")
);
CREATE INDEX "IDX_approval_org_case" ON "approval_decisions"("organisation_id", "travel_case_id");

CREATE TABLE "authorities_to_proceed" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "travel_case_id" varchar NOT NULL REFERENCES "travel_cases"("id"),
  "issued_by_membership_id" varchar NOT NULL REFERENCES "organisation_memberships"("id"),
  "status" varchar(30) NOT NULL DEFAULT 'issued',
  "reference" varchar(100),
  "issued_at" timestamp NOT NULL DEFAULT now(),
  "revoked_at" timestamp,
  "reason" text
);
CREATE INDEX "IDX_authority_org_case" ON "authorities_to_proceed"("organisation_id", "travel_case_id");

CREATE TABLE "case_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "travel_case_id" varchar NOT NULL REFERENCES "travel_cases"("id"),
  "document_type" varchar(80) NOT NULL,
  "classification" varchar(30) NOT NULL DEFAULT 'internal',
  "current_version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "IDX_case_documents_org_case" ON "case_documents"("organisation_id", "travel_case_id");

CREATE TABLE "document_versions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "document_id" varchar NOT NULL REFERENCES "case_documents"("id"),
  "version" integer NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "mime_type" varchar(150) NOT NULL,
  "size_bytes" integer NOT NULL,
  "checksum" varchar(128) NOT NULL,
  "uploaded_by_membership_id" varchar NOT NULL REFERENCES "organisation_memberships"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_document_version" UNIQUE("document_id", "version")
);
CREATE INDEX "IDX_document_versions_org_document" ON "document_versions"("organisation_id", "document_id");

CREATE TABLE "billing_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id" varchar NOT NULL REFERENCES "organisations"("id"),
  "travel_case_id" varchar NOT NULL REFERENCES "travel_cases"("id"),
  "event_type" varchar(80) NOT NULL,
  "amount" numeric(12,2),
  "currency" varchar(3) NOT NULL DEFAULT 'FJD',
  "occurred_at" timestamp NOT NULL DEFAULT now(),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "UQ_billing_case_event" UNIQUE("travel_case_id", "event_type")
);
CREATE INDEX "IDX_billing_events_org_time" ON "billing_events"("organisation_id", "occurred_at");

