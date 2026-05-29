CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"user_id" varchar NOT NULL,
	"user_name" varchar(255),
	"action" text NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"changes" jsonb,
	"metadata" jsonb,
	"ip_address" varchar(50),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"contact_email" varchar(255),
	"timezone" varchar(100) DEFAULT 'Pacific/Fiji',
	"logo_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_company_code_unique" UNIQUE("company_code")
);
--> statement-breakpoint
CREATE TABLE "cost_centres" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"budget_limit" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegate_assignments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"acting_for" varchar(100) NOT NULL,
	"start_date" varchar(20) NOT NULL,
	"end_date" varchar(20) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"name" varchar(255) NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"placeholders" text[],
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" varchar PRIMARY KEY NOT NULL,
	"tcl_number" varchar(30),
	"request_id" varchar(100) NOT NULL,
	"travel_request_ref" varchar(50),
	"company_code" varchar(20) NOT NULL,
	"employee_id" varchar(100) NOT NULL,
	"employee_name" varchar(255) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'FJD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" varchar(100),
	"review_notes" text,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reconciliation" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_claims_tcl_number_unique" UNIQUE("tcl_number")
);
--> statement-breakpoint
CREATE TABLE "per_diem_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"location" varchar(255) NOT NULL,
	"location_code" varchar(10),
	"daily_rate" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'FJD' NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"min_quotes_domestic" integer DEFAULT 2 NOT NULL,
	"min_quotes_international" integer DEFAULT 3 NOT NULL,
	"allow_override" boolean DEFAULT true NOT NULL,
	"override_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quote_policies_company_code_unique" UNIQUE("company_code")
);
--> statement-breakpoint
CREATE TABLE "ref_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"last_counter" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"target_roles" text[],
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"name" varchar(255) NOT NULL,
	"description" text,
	"policy_type" text NOT NULL,
	"rules" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_quotes" (
	"id" varchar PRIMARY KEY NOT NULL,
	"request_id" varchar(100) NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"vendor_name" varchar(255) NOT NULL,
	"vendor_email" varchar(255) NOT NULL,
	"quote_value" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'FJD' NOT NULL,
	"pnr" varchar(100),
	"quote_expiry" varchar(30),
	"notes" text,
	"attachment_url" text,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_requests" (
	"id" varchar PRIMARY KEY NOT NULL,
	"ttr_number" varchar(30),
	"company_code" varchar(20) NOT NULL,
	"employee_id" varchar(100) NOT NULL,
	"employee_name" varchar(255) NOT NULL,
	"employee_number" varchar(50) NOT NULL,
	"position" varchar(255) NOT NULL,
	"department" varchar(255) NOT NULL,
	"start_date" varchar(20) NOT NULL,
	"end_date" varchar(20) NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"funding_type" text DEFAULT 'advance' NOT NULL,
	"approver_flow" text[] DEFAULT '{}'::text[] NOT NULL,
	"approver_index" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" varchar(100),
	"review_comment" text,
	"audit_flag" boolean DEFAULT false NOT NULL,
	"audit_note" text,
	"needs_flights" boolean DEFAULT false NOT NULL,
	"needs_accommodation" boolean DEFAULT false NOT NULL,
	"needs_visa" boolean DEFAULT false NOT NULL,
	"needs_transport" boolean DEFAULT false NOT NULL,
	"total_estimated_budget" numeric(12, 2),
	"preferred_route" varchar(255),
	"travel_mode" varchar(10),
	"selected_quote_id" varchar(100),
	"quote_justification" text,
	"quote_requirement_overridden" boolean DEFAULT false NOT NULL,
	"quote_override_reason" text,
	"approval_token" varchar(500),
	"approval_token_expiry" varchar(30),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(50),
	"country_risk_level" varchar(10),
	"destination" jsonb NOT NULL,
	"cost_centre" jsonb NOT NULL,
	"per_diem" jsonb NOT NULL,
	"visa_check" jsonb NOT NULL,
	"cost_breakdown" jsonb,
	"rfq_recipients" jsonb,
	"suggested_modes" jsonb,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "travel_requests_ttr_number_unique" UNIQUE("ttr_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar(50) DEFAULT 'employee',
	"company_code" varchar(20),
	"password_hash" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"name" varchar(255) NOT NULL,
	"category" varchar(50) DEFAULT 'Other' NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(50),
	"services" text[] NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"proposed_by" varchar NOT NULL,
	"proposed_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"suspension_reason" text,
	"performance_rating" integer,
	"performance_reviews" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_code" varchar(20),
	"name" varchar(255) NOT NULL,
	"description" text,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"stages" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_delegate_assignments_user_id" ON "delegate_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_delegate_assignments_company_code" ON "delegate_assignments" USING btree ("company_code");--> statement-breakpoint
CREATE INDEX "IDX_expense_claims_request_id" ON "expense_claims" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "IDX_expense_claims_company_code" ON "expense_claims" USING btree ("company_code");--> statement-breakpoint
CREATE INDEX "IDX_expense_claims_employee_id" ON "expense_claims" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "IDX_expense_claims_status" ON "expense_claims" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_ref_sequences_lookup" ON "ref_sequences" USING btree ("company_code","prefix","year");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "IDX_travel_quotes_request_id" ON "travel_quotes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "IDX_travel_quotes_company_code" ON "travel_quotes" USING btree ("company_code");--> statement-breakpoint
CREATE INDEX "IDX_travel_requests_company_code" ON "travel_requests" USING btree ("company_code");--> statement-breakpoint
CREATE INDEX "IDX_travel_requests_status" ON "travel_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_travel_requests_employee_id" ON "travel_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "IDX_travel_requests_start_date" ON "travel_requests" USING btree ("start_date");