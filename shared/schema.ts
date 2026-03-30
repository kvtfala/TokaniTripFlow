import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, boolean, integer, decimal } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Role type for validation
export const userRoleSchema = z.enum(["employee", "coordinator", "manager", "finance_admin", "travel_admin", "super_admin"]);
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
  performanceRating: integer("performance_rating"), // 1-5 stars
  notes: text("notes"), // Internal admin notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: vendorStatusSchema,
  category: vendorCategorySchema.optional().default("Other"),
  performanceRating: z.number().int().min(1).max(5).optional().nullable(),
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
export const policyTypeSchema = z.enum(["advance_booking", "cost_threshold", "visa_requirement", "approval_flow", "expense_limit"]);
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
