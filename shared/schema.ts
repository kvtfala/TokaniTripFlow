import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, uniqueIndex, boolean, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Replit Auth Integration - Session storage table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth Integration - User storage table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// Extended with company_code and password_hash for demo login support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).default("employee"),
  companyCode: varchar("company_code", { length: 20 }), // Demo company identifier (e.g., "itt001")
  passwordHash: varchar("password_hash"), // For demo login only (not used by Replit Auth)
  isActive: boolean("is_active").notNull().default(true), // Deactivation flag
  lastLogin: timestamp("last_login"), // Tracked on each login
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Role type for validation
export const userRoleSchema = z.enum(["employee", "coordinator", "approver", "manager", "finance_admin", "travel_desk", "travel_admin", "super_admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

// Vendor status enum
export const vendorStatusSchema = z.enum(["pending_approval", "approved", "rejected", "suspended"]);
export type VendorStatus = z.infer<typeof vendorStatusSchema>;

// Vendor category enum
export const vendorCategorySchema = z.enum(["Airlines", "Hotels", "Car Rental", "Visa Services", "Events", "Other"]);
export type VendorCategory = z.infer<typeof vendorCategorySchema>;

// Vendors table - Supplier directory with approval workflow
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant isolation
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("Other"), // Airlines, Hotels, Events, etc.
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  services: text("services").array().notNull(), // ["flights", "hotels", "car_rental", "visa_services"]
  status: text("status").$type<VendorStatus>().notNull().default("pending_approval"),
  proposedBy: varchar("proposed_by").notNull(), // User ID who added vendor
  proposedAt: timestamp("proposed_at").notNull().defaultNow(),
  approvedBy: varchar("approved_by"), // Finance admin user ID
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  suspensionReason: text("suspension_reason"),
  performanceRating: integer("performance_rating"), // 1-5 stars (computed average of all reviews)
  performanceReviews: jsonb("performance_reviews").$type<Array<{ rating: number; comment: string; date: string }>>(), // review history
  notes: text("notes"), // Internal admin notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;
export const vendorReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  date: z.string(),
});
export type VendorReview = z.infer<typeof vendorReviewSchema>;

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: vendorStatusSchema,
  category: vendorCategorySchema.optional().default("Other"),
  performanceRating: z.number().int().min(1).max(5).optional().nullable(),
  performanceReviews: z.array(vendorReviewSchema).optional().nullable(),
});

// Email template category enum
export const templateCategorySchema = z.enum(["approval", "booking", "delegation", "notification", "reminder"]);
export type TemplateCategory = z.infer<typeof templateCategorySchema>;

// Email Templates table - Customizable email content
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant isolation
  name: varchar("name", { length: 255 }).notNull(), // e.g., "approval_notification"
  description: text("description"),
  subject: text("subject").notNull(),
  body: text("body").notNull(), // HTML content with {{placeholders}}
  placeholders: text("placeholders").array(), // Available variables: ["travelerName", "destination"]
  category: text("category").$type<TemplateCategory>(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  category: templateCategorySchema.optional().nullable(),
});

// Per Diem Rates table - Location-based daily allowances
export const perDiemRates = pgTable("per_diem_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant isolation
  location: varchar("location", { length: 255 }).notNull(), // Country or city
  locationCode: varchar("location_code", { length: 10 }), // ISO country code or city code
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(), // Decimal for currency
  currency: varchar("currency", { length: 10 }).notNull().default("FJD"),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PerDiemRate = typeof perDiemRates.$inferSelect;
export type InsertPerDiemRate = typeof perDiemRates.$inferInsert;
export const insertPerDiemRateSchema = createInsertSchema(perDiemRates).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dailyRate: z.string().or(z.number()), // Accept either string or number
});

// Policy type enum
export const policyTypeSchema = z.enum(["advance_booking", "cost_threshold", "visa_requirement", "approval_flow", "expense_limit", "transport_mode", "accommodation_cap"]);
export type PolicyType = z.infer<typeof policyTypeSchema>;

// Travel Policies table - Business rules and thresholds
export const travelPolicies = pgTable("travel_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant isolation
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  policyType: text("policy_type").$type<PolicyType>().notNull(),
  rules: jsonb("rules").notNull(), // Structured JSON with policy rules
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(5), // 1-10, higher = more important
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TravelPolicy = typeof travelPolicies.$inferSelect;
export type InsertTravelPolicy = typeof travelPolicies.$inferInsert;
export const insertTravelPolicySchema = createInsertSchema(travelPolicies).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  policyType: policyTypeSchema,
  priority: z.number().int().min(1).max(10),
});

// Workflow Rules table - Approval flow configuration
export const workflowRules = pgTable("workflow_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant isolation
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(), // When to apply: {costGreaterThan: 5000, isInternational: true}
  actions: jsonb("actions").notNull(), // What to do: {addApprover: "finance_admin", requireQuotes: 3}
  stages: text("stages").array(), // Approval stages: ["coordinator", "manager", "finance"]
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(5), // 1-10, higher = more important
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WorkflowRule = typeof workflowRules.$inferSelect;
export type InsertWorkflowRule = typeof workflowRules.$inferInsert;
export const insertWorkflowRuleSchema = createInsertSchema(workflowRules).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  priority: z.number().int().min(1).max(10),
});

// Notification type and severity enums
export const notificationTypeSchema = z.enum(["banner", "alert", "info", "warning", "maintenance"]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSeveritySchema = z.enum(["info", "warning", "error", "success"]);
export type NotificationSeverity = z.infer<typeof notificationSeveritySchema>;

// System Notifications table - App-wide messages and alerts
export const systemNotifications = pgTable("system_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant isolation
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: text("type").$type<NotificationType>().notNull(),
  severity: text("severity").$type<NotificationSeverity>().notNull().default("info"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  targetRoles: text("target_roles").array(), // Show only to specific roles, empty = all users
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SystemNotification = typeof systemNotifications.$inferSelect;
export type InsertSystemNotification = typeof systemNotifications.$inferInsert;
export const insertSystemNotificationSchema = createInsertSchema(systemNotifications).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  type: notificationTypeSchema,
  severity: notificationSeveritySchema,
});

// Audit action enum
export const auditActionSchema = z.enum(["create", "update", "delete", "approve", "reject", "suspend", "activate"]);
export type AuditAction = z.infer<typeof auditActionSchema>;

// Audit Logs table - Track admin actions for compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }), // Tenant scoping
  userId: varchar("user_id").notNull(), // Who performed the action
  userName: varchar("user_name", { length: 255 }),
  action: text("action").$type<AuditAction>().notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // "vendor", "user", "policy", "template"
  entityId: varchar("entity_id").notNull(),
  previousValue: jsonb("previous_value"), // State before change (for update/delete)
  newValue: jsonb("new_value"), // State after change (for create/update)
  changes: jsonb("changes"), // Detailed field-level changes: {field: {old: "x", new: "y"}}
  metadata: jsonb("metadata"), // Additional context (e.g., vendorName, cost)
  ipAddress: varchar("ip_address", { length: 50 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true }).extend({
  action: auditActionSchema,
});

// Company Settings table - Per-tenant company profile configuration
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  timezone: varchar("timezone", { length: 100 }).default("Pacific/Fiji"),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true, createdAt: true, updatedAt: true });

// Cost Centres table - DB-backed cost centre management
export const costCentres = pgTable("cost_centres", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyCode: varchar("company_code", { length: 20 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  budgetLimit: decimal("budget_limit", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CostCentreRecord = typeof costCentres.$inferSelect;
export type InsertCostCentreRecord = typeof costCentres.$inferInsert;
export const insertCostCentreSchema = createInsertSchema(costCentres).omit({ id: true, createdAt: true, updatedAt: true });

// ─────────────────────────────────────────────────────────────────────────────
// TRIPFLOW OPERATIONAL TABLES
// Added in Phase 0.6 — schema definitions only.
// These tables mirror the MemStorage in-memory maps and will be activated in
// a later phase (Chunk 4) when DbStorage replaces MemStorage.
// The live app continues to use MemStorage until that swap is made.
// ─────────────────────────────────────────────────────────────────────────────

// RequestStatus enum — mirrors RequestStatus in shared/types.ts
export const requestStatusSchema = z.enum([
  "draft",
  "pending",
  "submitted",
  "in_review",
  "awaiting_quotes",
  "quotes_submitted",
  "approved",
  "rejected",
  "ticketed",
]);
export type RequestStatusDb = z.infer<typeof requestStatusSchema>;

// FundingType enum — mirrors FundingType in shared/types.ts
export const fundingTypeSchema = z.enum(["advance", "reimbursement"]);
export type FundingTypeDb = z.infer<typeof fundingTypeSchema>;

// Travel Requests table — persists the core TravelRequest entity.
// Scalar fields that are filtered/sorted/queried get typed columns.
// Nested objects that are always read/written as a whole are stored as JSONB.
export const travelRequests = pgTable(
  "travel_requests",
  {
    id: varchar("id").primaryKey(), // e.g. "req-a1b2c3d4" — generated by app, not DB
    ttrNumber: varchar("ttr_number", { length: 30 }).unique(), // e.g. "TTR-2026-00001"
    companyCode: varchar("company_code", { length: 20 }).notNull(), // Tenant isolation

    // Traveller identity — indexed for search
    employeeId: varchar("employee_id", { length: 100 }).notNull(),
    employeeName: varchar("employee_name", { length: 255 }).notNull(),
    employeeNumber: varchar("employee_number", { length: 50 }).notNull(),
    position: varchar("position", { length: 255 }).notNull(),
    department: varchar("department", { length: 255 }).notNull(),

    // Trip dates — stored as varchar ISO strings to match existing code convention
    startDate: varchar("start_date", { length: 20 }).notNull(), // "2026-03-05"
    endDate: varchar("end_date", { length: 20 }).notNull(),     // "2026-03-12"
    purpose: text("purpose").notNull(),

    // Status and workflow
    status: text("status").$type<RequestStatusDb>().notNull().default("submitted"),
    fundingType: text("funding_type").$type<FundingTypeDb>().notNull().default("advance"),
    approverFlow: text("approver_flow").array().notNull().default(sql`'{}'::text[]`), // ordered list of user IDs
    approverIndex: integer("approver_index").notNull().default(0),

    // Review / decision fields
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: varchar("reviewed_by", { length: 100 }),
    reviewComment: text("review_comment"),
    auditFlag: boolean("audit_flag").notNull().default(false),
    auditNote: text("audit_note"),

    // Service flags
    needsFlights: boolean("needs_flights").notNull().default(false),
    needsAccommodation: boolean("needs_accommodation").notNull().default(false),
    needsVisa: boolean("needs_visa").notNull().default(false),
    needsTransport: boolean("needs_transport").notNull().default(false),

    // Budget
    totalEstimatedBudget: decimal("total_estimated_budget", { precision: 12, scale: 2 }),

    // Routing
    preferredRoute: varchar("preferred_route", { length: 255 }), // e.g. "NAN → SYD via AKL"
    travelMode: varchar("travel_mode", { length: 10 }), // "Air" | "Land" | "Sea"

    // RFQ / Quote selection
    selectedQuoteId: varchar("selected_quote_id", { length: 100 }),
    quoteJustification: text("quote_justification"),
    quoteRequirementOverridden: boolean("quote_requirement_overridden").notNull().default(false),
    quoteOverrideReason: text("quote_override_reason"),

    // Tokenized approval (manager email link)
    approvalToken: varchar("approval_token", { length: 500 }),
    approvalTokenExpiry: varchar("approval_token_expiry", { length: 30 }), // ISO date string

    // Traveller welfare (Travel Command Centre)
    emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
    countryRiskLevel: varchar("country_risk_level", { length: 10 }), // "low" | "medium" | "high"

    // ── TTC Case Management fields (Phase 1) ─────────────────────────────
    // Tokani Travel Coordination operational metadata — editable by coordinator/travel_admin/super_admin only.
    ttcCaseType: varchar("ttc_case_type", { length: 50 }), // nullable — set by coordinator when case is classified
    ttcPriority: varchar("ttc_priority", { length: 20 }).notNull().default("normal"), // normal | high | urgent
    ttcServiceLevel: varchar("ttc_service_level", { length: 20 }).notNull().default("remote"), // remote | full_service | onsite
    currentDependency: varchar("current_dependency", { length: 30 }).notNull().default("none"), // who is blocking next step
    nextAction: text("next_action"), // free-text next step for coordinator
    followUpDueDate: timestamp("follow_up_due_date"), // when to follow up
    issueFlag: boolean("issue_flag").notNull().default(false), // coordinator marks problem cases
    caseOwner: varchar("case_owner", { length: 100 }), // user ID of assigned coordinator

    // ── JSONB columns — nested objects read/written as a whole ─────────────
    // destination: { code, city, country }
    destination: jsonb("destination").$type<{ code: string; city: string; country: string }>().notNull(),
    // costCentre: { code, name }
    costCentre: jsonb("cost_centre").$type<{ code: string; name: string }>().notNull(),
    // perDiem: PerDiemCalculation
    perDiem: jsonb("per_diem").$type<{
      totalFJD: number;
      days: number;
      mieFJD: number;
      firstDayFJD: number;
      middleDaysFJD: number;
      lastDayFJD: number;
    }>().notNull(),
    // visaCheck: VisaCheckResult
    visaCheck: jsonb("visa_check").$type<{
      status: string;
      message: string;
      policyLink?: string;
    }>().notNull(),
    // costBreakdown: TravelCostBreakdown (nullable — not all requests have one)
    costBreakdown: jsonb("cost_breakdown").$type<{
      flights?: number;
      accommodation?: number;
      groundTransfers?: number;
      visaFees?: number;
      perDiem: number;
      totalCost: number;
    }>(),
    // rfqRecipients: list of vendors the RFQ was sent to
    rfqRecipients: jsonb("rfq_recipients").$type<Array<{
      vendorName: string;
      email: string;
      sentAt: string;
    }>>(),
    // suggestedModes: route-intelligence transport suggestions
    suggestedModes: jsonb("suggested_modes").$type<Array<"Air" | "Land" | "Sea">>(),
    // history: append-only lifecycle trail (HistoryEntry[])
    // Stored as JSONB because it is always fetched as part of the parent request
    // and no query ever needs to filter on individual history entries.
    history: jsonb("history").$type<Array<{
      ts: string;
      actor: string;
      action: string;
      note?: string;
    }>>().notNull().default(sql`'[]'::jsonb`),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("IDX_travel_requests_company_code").on(table.companyCode),
    index("IDX_travel_requests_status").on(table.status),
    index("IDX_travel_requests_employee_id").on(table.employeeId),
    index("IDX_travel_requests_start_date").on(table.startDate),
  ],
);

export type TravelRequestRecord = typeof travelRequests.$inferSelect;
export type InsertTravelRequestRecord = typeof travelRequests.$inferInsert;
export const insertTravelRequestSchema = createInsertSchema(travelRequests).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  status: requestStatusSchema.optional(),
  fundingType: fundingTypeSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0 PRODUCTION CORE (ADDITIVE)
// These organisation-owned tables are introduced alongside the demo-oriented
// travel_requests model. Existing reads and writes remain unchanged until data
// has been backfilled, reconciled and moved behind a feature flag.
// ─────────────────────────────────────────────────────────────────────────────

export const membershipRoleSchema = z.enum([
  "employee", "coordinator", "approver", "manager", "finance_admin",
  "travel_desk", "travel_admin", "organisation_admin",
]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const caseStatusSchema = z.enum([
  "draft", "submitted", "in_review", "authorised", "coordinating",
  "ready_to_travel", "in_travel", "completed", "cancelled",
]);
export type CaseStatusDb = z.infer<typeof caseStatusSchema>;

export const serviceComponentTypeSchema = z.enum([
  "flight", "accommodation", "transfer", "ground_transport", "visa",
  "venue", "insurance", "other",
]);
export type ServiceComponentType = z.infer<typeof serviceComponentTypeSchema>;

export const organisations = pgTable("organisations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  timezone: varchar("timezone", { length: 100 }).notNull().default("Pacific/Fiji"),
  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("FJD"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organisationMemberships = pgTable(
  "organisation_memberships",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    userId: varchar("user_id").notNull().references(() => users.id),
    role: varchar("role", { length: 50 }).$type<MembershipRole>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_organisation_membership_user").on(table.organisationId, table.userId),
    index("IDX_organisation_memberships_user").on(table.userId),
  ],
);

export const travelCases = pgTable(
  "travel_cases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    referenceNumber: varchar("reference_number", { length: 50 }).notNull(),
    legacyRequestId: varchar("legacy_request_id", { length: 100 }),
    travellerUserId: varchar("traveller_user_id").references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    purpose: text("purpose").notNull(),
    status: varchar("status", { length: 40 }).$type<CaseStatusDb>().notNull().default("draft"),
    priority: varchar("priority", { length: 20 }).notNull().default("normal"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    ownerMembershipId: varchar("owner_membership_id").references(() => organisationMemberships.id),
    submittedAt: timestamp("submitted_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_travel_cases_org_reference").on(table.organisationId, table.referenceNumber),
    uniqueIndex("UQ_travel_cases_legacy_request").on(table.legacyRequestId),
    index("IDX_travel_cases_org_status").on(table.organisationId, table.status),
  ],
);

export const serviceComponents = pgTable(
  "service_components",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    travelCaseId: varchar("travel_case_id").notNull().references(() => travelCases.id),
    type: varchar("type", { length: 40 }).$type<ServiceComponentType>().notNull(),
    status: varchar("status", { length: 40 }).notNull().default("required"),
    sequence: integer("sequence").notNull().default(0),
    requirements: jsonb("requirements").notNull().default(sql`'{}'::jsonb`),
    providerId: varchar("provider_id").references(() => vendors.id),
    providerReference: varchar("provider_reference", { length: 100 }),
    estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("FJD"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("IDX_service_components_org_case").on(table.organisationId, table.travelCaseId),
  ],
);

export const caseEvents = pgTable(
  "case_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    travelCaseId: varchar("travel_case_id").notNull().references(() => travelCases.id),
    actorMembershipId: varchar("actor_membership_id").references(() => organisationMemberships.id),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    fromStatus: varchar("from_status", { length: 40 }),
    toStatus: varchar("to_status", { length: 40 }),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  },
  (table) => [
    index("IDX_case_events_org_case_time").on(table.organisationId, table.travelCaseId, table.occurredAt),
  ],
);

export type Organisation = typeof organisations.$inferSelect;
export type OrganisationMembership = typeof organisationMemberships.$inferSelect;
export type TravelCase = typeof travelCases.$inferSelect;
export type ServiceComponent = typeof serviceComponents.$inferSelect;
export type CaseEvent = typeof caseEvents.$inferSelect;

export const approvalDecisions = pgTable(
  "approval_decisions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    travelCaseId: varchar("travel_case_id").notNull().references(() => travelCases.id),
    sequence: integer("sequence").notNull(),
    approverMembershipId: varchar("approver_membership_id").notNull().references(() => organisationMemberships.id),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    comment: text("comment"),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_approval_case_sequence").on(table.travelCaseId, table.sequence),
    index("IDX_approval_org_case").on(table.organisationId, table.travelCaseId),
  ],
);

export const authoritiesToProceed = pgTable(
  "authorities_to_proceed",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    travelCaseId: varchar("travel_case_id").notNull().references(() => travelCases.id),
    issuedByMembershipId: varchar("issued_by_membership_id").notNull().references(() => organisationMemberships.id),
    status: varchar("status", { length: 30 }).notNull().default("issued"),
    reference: varchar("reference", { length: 100 }),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
    reason: text("reason"),
  },
  (table) => [index("IDX_authority_org_case").on(table.organisationId, table.travelCaseId)],
);

export const caseDocuments = pgTable(
  "case_documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    travelCaseId: varchar("travel_case_id").notNull().references(() => travelCases.id),
    documentType: varchar("document_type", { length: 80 }).notNull(),
    classification: varchar("classification", { length: 30 }).notNull().default("internal"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("IDX_case_documents_org_case").on(table.organisationId, table.travelCaseId)],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    documentId: varchar("document_id").notNull().references(() => caseDocuments.id),
    version: integer("version").notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 150 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: varchar("checksum", { length: 128 }).notNull(),
    uploadedByMembershipId: varchar("uploaded_by_membership_id").notNull().references(() => organisationMemberships.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_document_version").on(table.documentId, table.version),
    index("IDX_document_versions_org_document").on(table.organisationId, table.documentId),
  ],
);

export const billingEvents = pgTable(
  "billing_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id),
    travelCaseId: varchar("travel_case_id").notNull().references(() => travelCases.id),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("FJD"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("UQ_billing_case_event").on(table.travelCaseId, table.eventType),
    index("IDX_billing_events_org_time").on(table.organisationId, table.occurredAt),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────

// Travel Quotes table — persists vendor quotes collected during the RFQ workflow.
// One travel request can have many quotes (1:N).
export const travelQuotes = pgTable(
  "travel_quotes",
  {
    id: varchar("id").primaryKey(), // e.g. "quote-a1b2c3d4" — generated by app
    requestId: varchar("request_id", { length: 100 }).notNull(), // FK → travel_requests.id
    companyCode: varchar("company_code", { length: 20 }).notNull(), // Denormalized for fast tenant filtering

    vendorName: varchar("vendor_name", { length: 255 }).notNull(),
    vendorEmail: varchar("vendor_email", { length: 255 }).notNull(),
    quoteValue: decimal("quote_value", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("FJD"),
    pnr: varchar("pnr", { length: 100 }),           // Reservation/reference number
    quoteExpiry: varchar("quote_expiry", { length: 30 }), // ISO date string
    notes: text("notes"),
    attachmentUrl: text("attachment_url"),           // Object Storage URL for quote PDF
    createdBy: varchar("created_by", { length: 100 }).notNull(), // User ID who logged the quote

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("IDX_travel_quotes_request_id").on(table.requestId),
    index("IDX_travel_quotes_company_code").on(table.companyCode),
  ],
);

export type TravelQuoteRecord = typeof travelQuotes.$inferSelect;
export type InsertTravelQuoteRecord = typeof travelQuotes.$inferInsert;
export const insertTravelQuoteSchema = createInsertSchema(travelQuotes).omit({
  createdAt: true,
  updatedAt: true,
});

// ─────────────────────────────────────────────────────────────────────────────

// ClaimStatus enum — mirrors ClaimStatus in shared/types.ts
export const claimStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "paid",
]);
export type ClaimStatusDb = z.infer<typeof claimStatusSchema>;

// Expense Claims table — persists post-trip expense claims.
// lineItems and reconciliation are stored as JSONB because they are always
// read/written as a batch and no query ever filters on individual line items.
export const expenseClaims = pgTable(
  "expense_claims",
  {
    id: varchar("id").primaryKey(), // e.g. "claim-a1b2c3d4" — generated by app
    tclNumber: varchar("tcl_number", { length: 30 }).unique(), // e.g. "TCL-2026-00001"
    requestId: varchar("request_id", { length: 100 }).notNull(), // FK → travel_requests.id
    travelRequestRef: varchar("travel_request_ref", { length: 50 }), // human-readable TTR reference
    companyCode: varchar("company_code", { length: 20 }).notNull(), // Tenant isolation

    employeeId: varchar("employee_id", { length: 100 }).notNull(),
    employeeName: varchar("employee_name", { length: 255 }).notNull(),

    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("FJD"),
    status: text("status").$type<ClaimStatusDb>().notNull().default("draft"),

    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: varchar("reviewed_by", { length: 100 }),
    reviewNotes: text("review_notes"),

    // ── JSONB columns ───────────────────────────────────────────────────────
    // lineItems: ExpenseLineItem[] — receipt line items, always read/written as a batch
    lineItems: jsonb("line_items").$type<Array<{
      id: string;
      description: string;
      category: string;
      amount: number;
      receiptUrl?: string;
      merchantName?: string;
      receiptDate?: string;
      ocrConfidence?: string;
      notes?: string;
    }>>().notNull().default(sql`'[]'::jsonb`),
    // reconciliation: advance/variance settlement details
    reconciliation: jsonb("reconciliation").$type<{
      advanceAmount?: number;
      varianceAmount?: number;
      paymentMethod?: string;
      paidAt?: string;
    }>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("IDX_expense_claims_request_id").on(table.requestId),
    index("IDX_expense_claims_company_code").on(table.companyCode),
    index("IDX_expense_claims_employee_id").on(table.employeeId),
    index("IDX_expense_claims_status").on(table.status),
  ],
);

export type ExpenseClaimRecord = typeof expenseClaims.$inferSelect;
export type InsertExpenseClaimRecord = typeof expenseClaims.$inferInsert;
export const insertExpenseClaimSchema = createInsertSchema(expenseClaims).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  status: claimStatusSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────

// Delegate Assignments table — persists approval delegation records.
// Fully flat structure — no JSONB needed.
export const delegateAssignments = pgTable(
  "delegate_assignments",
  {
    id: varchar("id").primaryKey(), // e.g. "del-a1b2c3d4" — generated by app
    companyCode: varchar("company_code", { length: 20 }).notNull(), // Tenant isolation
    userId: varchar("user_id", { length: 100 }).notNull(),   // The person delegating away
    actingFor: varchar("acting_for", { length: 100 }).notNull(), // The person being delegated to
    startDate: varchar("start_date", { length: 20 }).notNull(), // ISO date string "2026-03-01"
    endDate: varchar("end_date", { length: 20 }).notNull(),     // ISO date string "2026-03-15"
    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("IDX_delegate_assignments_user_id").on(table.userId),
    index("IDX_delegate_assignments_company_code").on(table.companyCode),
  ],
);

export type DelegateAssignmentRecord = typeof delegateAssignments.$inferSelect;
export type InsertDelegateAssignmentRecord = typeof delegateAssignments.$inferInsert;
export const insertDelegateAssignmentSchema = createInsertSchema(delegateAssignments).omit({
  createdAt: true,
  updatedAt: true,
});

// ─────────────────────────────────────────────────────────────────────────────

// Quote Policies table — persists the per-tenant quote minimum requirements.
// Currently a singleton in MemStorage; here it is scoped per tenant via companyCode.
export const quotePolicies = pgTable(
  "quote_policies",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyCode: varchar("company_code", { length: 20 }).notNull().unique(), // One policy per tenant
    name: varchar("name", { length: 255 }).notNull(),
    minQuotesDomestic: integer("min_quotes_domestic").notNull().default(2),     // Minimum quotes for domestic trips
    minQuotesInternational: integer("min_quotes_international").notNull().default(3), // Minimum quotes for international trips
    allowOverride: boolean("allow_override").notNull().default(true),
    overrideRoles: text("override_roles").array().notNull().default(sql`'{}'::text[]`), // e.g. ["manager", "finance_admin"]

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export type QuotePolicyRecord = typeof quotePolicies.$inferSelect;
export type InsertQuotePolicyRecord = typeof quotePolicies.$inferInsert;
export const insertQuotePolicySchema = createInsertSchema(quotePolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ─────────────────────────────────────────────────────────────────────────────

// Reference Sequences table — provides crash-safe, duplicate-free TTR and TCL
// number generation by replacing the in-memory counters in MemStorage.
//
// Usage pattern (executed inside a DB transaction):
//   UPDATE ref_sequences
//   SET last_counter = last_counter + 1
//   WHERE company_code = $1 AND prefix = $2 AND year = $3
//   RETURNING last_counter;
//
// This guarantees uniqueness even under concurrent request submissions.
// Prefixes in use: "TTR" (ITT requests), "CDP" (CDP requests), "TCL" (expense claims).
export const refSequences = pgTable(
  "ref_sequences",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    companyCode: varchar("company_code", { length: 20 }).notNull(),
    prefix: varchar("prefix", { length: 20 }).notNull(), // "TTR", "CDP", "TCL"
    year: integer("year").notNull(),
    lastCounter: integer("last_counter").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Composite unique — only one counter row per tenant+prefix+year
    uniqueIndex("IDX_ref_sequences_lookup").on(table.companyCode, table.prefix, table.year),
  ],
);

export type RefSequenceRecord = typeof refSequences.$inferSelect;
export type InsertRefSequenceRecord = typeof refSequences.$inferInsert;
export const insertRefSequenceSchema = createInsertSchema(refSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
