import { eq, and, or, isNull, lte, gte, sql, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  vendors,
  emailTemplates,
  perDiemRates,
  travelPolicies,
  workflowRules,
  systemNotifications,
  auditLogs,
  companySettings,
  costCentres,
  travelRequests,
  travelQuotes,
  expenseClaims,
  delegateAssignments,
  quotePolicies,
  refSequences,
  type User,
  type UpsertUser,
  type Vendor,
  type InsertVendor,
  type EmailTemplate,
  type InsertEmailTemplate,
  type PerDiemRate,
  type InsertPerDiemRate,
  type TravelPolicy,
  type InsertTravelPolicy,
  type WorkflowRule,
  type InsertWorkflowRule,
  type SystemNotification,
  type InsertSystemNotification,
  type AuditLog,
  type InsertAuditLog,
  type CompanySettings,
  type InsertCompanySettings,
  type CostCentreRecord,
  type InsertCostCentreRecord,
  type TravelRequestRecord,
  type TravelQuoteRecord,
  type ExpenseClaimRecord,
  type DelegateAssignmentRecord,
  type QuotePolicyRecord,
} from "@shared/schema";
import type {
  TravelRequest,
  DelegateAssignment,
  TravelQuote,
  QuotePolicy,
  ExpenseClaim,
} from "@shared/types";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";

// ── Row → Application Type Converters ──────────────────────────────────────

function rowToTravelRequest(row: TravelRequestRecord): TravelRequest {
  // Build the object piece-by-piece and cast to TravelRequest at the end.
  // Many fields carry narrow union types from shared/types.ts that differ from
  // the broad `string` / `unknown` types Drizzle returns from the DB.
  const req: Record<string, unknown> = {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeNumber: row.employeeNumber,
    position: row.position,
    department: row.department,
    destination: row.destination,
    startDate: row.startDate,
    endDate: row.endDate,
    purpose: row.purpose,
    status: row.status,
    fundingType: row.fundingType,
    approverFlow: row.approverFlow,
    approverIndex: row.approverIndex,
    perDiem: row.perDiem,
    visaCheck: row.visaCheck,
    costCentre: row.costCentre,
    history: row.history ?? [],
    needsFlights: row.needsFlights,
    needsAccommodation: row.needsAccommodation,
    needsVisa: row.needsVisa,
    needsTransport: row.needsTransport,
    auditFlag: row.auditFlag,
    quoteRequirementOverridden: row.quoteRequirementOverridden,
  };
  if (row.ttrNumber) req.ttrNumber = row.ttrNumber;
  if (row.companyCode) req.companyCode = row.companyCode;
  if (row.submittedAt) req.submittedAt = row.submittedAt.toISOString();
  if (row.reviewedAt) req.reviewedAt = row.reviewedAt.toISOString();
  if (row.reviewedBy) req.reviewedBy = row.reviewedBy;
  if (row.reviewComment) req.reviewComment = row.reviewComment;
  if (row.auditNote) req.auditNote = row.auditNote;
  if (row.totalEstimatedBudget != null) req.totalEstimatedBudget = parseFloat(row.totalEstimatedBudget);
  if (row.preferredRoute) req.preferredRoute = row.preferredRoute;
  if (row.travelMode) req.travelMode = row.travelMode;
  if (row.suggestedModes) req.suggestedModes = row.suggestedModes;
  if (row.selectedQuoteId) req.selectedQuoteId = row.selectedQuoteId;
  if (row.quoteJustification) req.quoteJustification = row.quoteJustification;
  if (row.quoteOverrideReason) req.quoteOverrideReason = row.quoteOverrideReason;
  if (row.approvalToken) req.approvalToken = row.approvalToken;
  if (row.approvalTokenExpiry) req.approvalTokenExpiry = row.approvalTokenExpiry;
  if (row.emergencyContactName) req.emergencyContactName = row.emergencyContactName;
  if (row.emergencyContactPhone) req.emergencyContactPhone = row.emergencyContactPhone;
  if (row.countryRiskLevel) req.countryRiskLevel = row.countryRiskLevel;
  if (row.costBreakdown) req.costBreakdown = row.costBreakdown;
  if (row.rfqRecipients) req.rfqRecipients = row.rfqRecipients;
  return req as unknown as TravelRequest;
}

function rowToTravelQuote(row: TravelQuoteRecord): TravelQuote {
  const quote: TravelQuote = {
    id: row.id,
    requestId: row.requestId,
    vendorName: row.vendorName,
    vendorEmail: row.vendorEmail,
    quoteValue: parseFloat(row.quoteValue),
    currency: row.currency,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.pnr) quote.pnr = row.pnr;
  if (row.quoteExpiry) quote.quoteExpiry = row.quoteExpiry;
  if (row.notes) quote.notes = row.notes;
  if (row.attachmentUrl) quote.attachmentUrl = row.attachmentUrl;
  return quote;
}

function rowToExpenseClaim(row: ExpenseClaimRecord): ExpenseClaim {
  const claim: ExpenseClaim = {
    id: row.id,
    requestId: row.requestId,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    lineItems: (row.lineItems as ExpenseClaim["lineItems"]) ?? [],
    totalAmount: parseFloat(row.totalAmount),
    currency: row.currency,
    status: row.status as ExpenseClaim["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.tclNumber) claim.tclNumber = row.tclNumber;
  if (row.travelRequestRef) claim.travelRequestRef = row.travelRequestRef;
  if (row.submittedAt) claim.submittedAt = row.submittedAt.toISOString();
  if (row.reviewedAt) claim.reviewedAt = row.reviewedAt.toISOString();
  if (row.reviewedBy) claim.reviewedBy = row.reviewedBy;
  if (row.reviewNotes) claim.reviewNotes = row.reviewNotes;
  if (row.reconciliation) claim.reconciliation = row.reconciliation as ExpenseClaim["reconciliation"];
  return claim;
}

function rowToDelegateAssignment(row: DelegateAssignmentRecord): DelegateAssignment {
  return {
    id: row.id,
    userId: row.userId,
    actingFor: row.actingFor,
    startDate: row.startDate,
    endDate: row.endDate,
    active: row.active,
  };
}

function rowToQuotePolicy(row: QuotePolicyRecord): QuotePolicy {
  return {
    id: row.id,
    name: row.name,
    minQuotesDomestic: row.minQuotesDomestic,
    minQuotesInternational: row.minQuotesInternational,
    allowOverride: row.allowOverride,
    overrideRoles: row.overrideRoles,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── DbStorage Class ─────────────────────────────────────────────────────────

export class DbStorage implements IStorage {
  private db: typeof db;

  constructor(dbInstance: typeof db) {
    this.db = dbInstance;
  }

  // ── Reference Number Generation (crash-safe via atomic INSERT … ON CONFLICT DO UPDATE) ──

  private async nextRefCounter(companyCode: string, prefix: string, year: number): Promise<number> {
    const result = await this.db
      .insert(refSequences)
      .values({ id: randomUUID(), companyCode, prefix, year, lastCounter: 1 })
      .onConflictDoUpdate({
        target: [refSequences.companyCode, refSequences.prefix, refSequences.year],
        set: {
          lastCounter: sql`ref_sequences.last_counter + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ counter: refSequences.lastCounter });
    return result[0].counter;
  }

  private async generateTTRNumber(companyCode: string): Promise<string> {
    const prefix = companyCode === "cdp001" ? "CDP" : "TTR";
    const year = new Date().getFullYear();
    const counter = await this.nextRefCounter(companyCode, prefix, year);
    return `${prefix}-${year}-${String(counter).padStart(5, "0")}`;
  }

  private async generateTCLNumber(companyCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.nextRefCounter(companyCode, "TCL", year);
    return `TCL-${year}-${String(counter).padStart(5, "0")}`;
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    return row;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const id = userData.id || randomUUID();
    const [row] = await this.db
      .insert(users)
      .values({ ...userData, id, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role,
          companyCode: userData.companyCode,
          isActive: userData.isActive,
          lastLogin: userData.lastLogin,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row;
  }

  // ── Travel Requests ────────────────────────────────────────────────────

  async getTravelRequests(): Promise<TravelRequest[]> {
    const rows = await this.db.select().from(travelRequests);
    return rows.map(rowToTravelRequest);
  }

  async getTravelRequest(id: string): Promise<TravelRequest | undefined> {
    const [row] = await this.db.select().from(travelRequests).where(eq(travelRequests.id, id));
    return row ? rowToTravelRequest(row) : undefined;
  }

  async createTravelRequest(request: Omit<TravelRequest, "id">): Promise<TravelRequest> {
    const id = `req-${randomUUID().slice(0, 8)}`;
    const companyCode = (request as any).companyCode ?? "itt001";
    const ttrNumber = await this.generateTTRNumber(companyCode);
    const now = new Date();
    const history: TravelRequest["history"] = request.history?.length
      ? request.history
      : [{ ts: now.toISOString(), actor: request.employeeId, action: "SUBMIT", note: "Travel request submitted" }];

    const [row] = await this.db
      .insert(travelRequests)
      .values({
        id,
        ttrNumber,
        companyCode,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        employeeNumber: request.employeeNumber,
        position: request.position,
        department: request.department,
        startDate: request.startDate,
        endDate: request.endDate,
        purpose: request.purpose,
        status: request.status || "submitted",
        fundingType: request.fundingType || "advance",
        approverFlow: request.approverFlow || [],
        approverIndex: request.approverIndex ?? 0,
        submittedAt: request.submittedAt ? new Date(request.submittedAt) : now,
        reviewedAt: request.reviewedAt ? new Date(request.reviewedAt) : null,
        reviewedBy: request.reviewedBy || null,
        reviewComment: request.reviewComment || null,
        auditFlag: request.auditFlag ?? false,
        auditNote: request.auditNote || null,
        needsFlights: request.needsFlights ?? false,
        needsAccommodation: request.needsAccommodation ?? false,
        needsVisa: request.needsVisa ?? false,
        needsTransport: request.needsTransport ?? false,
        totalEstimatedBudget: request.totalEstimatedBudget?.toString() ?? null,
        preferredRoute: request.preferredRoute || null,
        travelMode: request.travelMode || null,
        suggestedModes: request.suggestedModes || null,
        selectedQuoteId: request.selectedQuoteId || null,
        quoteJustification: request.quoteJustification || null,
        quoteRequirementOverridden: request.quoteRequirementOverridden ?? false,
        quoteOverrideReason: request.quoteOverrideReason || null,
        approvalToken: request.approvalToken || null,
        approvalTokenExpiry: request.approvalTokenExpiry || null,
        emergencyContactName: request.emergencyContactName || null,
        emergencyContactPhone: request.emergencyContactPhone || null,
        countryRiskLevel: request.countryRiskLevel || null,
        destination: request.destination,
        costCentre: request.costCentre,
        perDiem: request.perDiem,
        visaCheck: request.visaCheck,
        costBreakdown: request.costBreakdown || null,
        rfqRecipients: request.rfqRecipients || null,
        history,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return rowToTravelRequest(row);
  }

  async updateTravelRequest(id: string, updates: Partial<TravelRequest>): Promise<TravelRequest | undefined> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.status !== undefined) set.status = updates.status;
    if (updates.approverIndex !== undefined) set.approverIndex = updates.approverIndex;
    if (updates.approverFlow !== undefined) set.approverFlow = updates.approverFlow;
    if (updates.history !== undefined) set.history = updates.history;
    if (updates.reviewedAt !== undefined) set.reviewedAt = updates.reviewedAt ? new Date(updates.reviewedAt) : null;
    if (updates.reviewedBy !== undefined) set.reviewedBy = updates.reviewedBy;
    if (updates.reviewComment !== undefined) set.reviewComment = updates.reviewComment;
    if (updates.auditFlag !== undefined) set.auditFlag = updates.auditFlag;
    if (updates.auditNote !== undefined) set.auditNote = updates.auditNote;
    if (updates.selectedQuoteId !== undefined) set.selectedQuoteId = updates.selectedQuoteId;
    if (updates.quoteJustification !== undefined) set.quoteJustification = updates.quoteJustification;
    if (updates.quoteRequirementOverridden !== undefined) set.quoteRequirementOverridden = updates.quoteRequirementOverridden;
    if (updates.quoteOverrideReason !== undefined) set.quoteOverrideReason = updates.quoteOverrideReason;
    if (updates.approvalToken !== undefined) set.approvalToken = updates.approvalToken;
    if (updates.approvalTokenExpiry !== undefined) set.approvalTokenExpiry = updates.approvalTokenExpiry;
    if (updates.needsFlights !== undefined) set.needsFlights = updates.needsFlights;
    if (updates.needsAccommodation !== undefined) set.needsAccommodation = updates.needsAccommodation;
    if (updates.needsVisa !== undefined) set.needsVisa = updates.needsVisa;
    if (updates.needsTransport !== undefined) set.needsTransport = updates.needsTransport;
    if (updates.destination !== undefined) set.destination = updates.destination;
    if (updates.costCentre !== undefined) set.costCentre = updates.costCentre;
    if (updates.perDiem !== undefined) set.perDiem = updates.perDiem;
    if (updates.visaCheck !== undefined) set.visaCheck = updates.visaCheck;
    if (updates.costBreakdown !== undefined) set.costBreakdown = updates.costBreakdown;
    if (updates.rfqRecipients !== undefined) set.rfqRecipients = updates.rfqRecipients;
    if (updates.totalEstimatedBudget !== undefined) set.totalEstimatedBudget = updates.totalEstimatedBudget?.toString() ?? null;
    if (updates.travelMode !== undefined) set.travelMode = updates.travelMode;
    if (updates.preferredRoute !== undefined) set.preferredRoute = updates.preferredRoute;
    if (updates.suggestedModes !== undefined) set.suggestedModes = updates.suggestedModes;
    if (updates.purpose !== undefined) set.purpose = updates.purpose;
    if (updates.startDate !== undefined) set.startDate = updates.startDate;
    if (updates.endDate !== undefined) set.endDate = updates.endDate;
    if (updates.emergencyContactName !== undefined) set.emergencyContactName = updates.emergencyContactName;
    if (updates.emergencyContactPhone !== undefined) set.emergencyContactPhone = updates.emergencyContactPhone;
    if (updates.countryRiskLevel !== undefined) set.countryRiskLevel = updates.countryRiskLevel;

    const [row] = await this.db.update(travelRequests).set(set).where(eq(travelRequests.id, id)).returning();
    return row ? rowToTravelRequest(row) : undefined;
  }

  // ── Delegations ────────────────────────────────────────────────────────

  async getDelegations(): Promise<DelegateAssignment[]> {
    const rows = await this.db.select().from(delegateAssignments);
    return rows.map(rowToDelegateAssignment);
  }

  async getDelegation(id: string): Promise<DelegateAssignment | undefined> {
    const [row] = await this.db.select().from(delegateAssignments).where(eq(delegateAssignments.id, id));
    return row ? rowToDelegateAssignment(row) : undefined;
  }

  async createDelegation(delegation: Omit<DelegateAssignment, "id">): Promise<DelegateAssignment> {
    // CHUNK 4 NOTE: DelegateAssignment in shared/types.ts lacks companyCode.
    // The DB column is NOT NULL. The route must inject companyCode before the storage swap.
    // Until then, (delegation as any).companyCode is the injection point; fallback is "__shared__".
    const id = `del-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(delegateAssignments)
      .values({
        id,
        companyCode: (delegation as any).companyCode ?? "__shared__",
        userId: delegation.userId,
        actingFor: delegation.actingFor,
        startDate: delegation.startDate,
        endDate: delegation.endDate,
        active: delegation.active,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return rowToDelegateAssignment(row);
  }

  async updateDelegation(id: string, updates: Partial<DelegateAssignment>): Promise<DelegateAssignment | undefined> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.userId !== undefined) set.userId = updates.userId;
    if (updates.actingFor !== undefined) set.actingFor = updates.actingFor;
    if (updates.startDate !== undefined) set.startDate = updates.startDate;
    if (updates.endDate !== undefined) set.endDate = updates.endDate;
    if (updates.active !== undefined) set.active = updates.active;

    const [row] = await this.db.update(delegateAssignments).set(set).where(eq(delegateAssignments.id, id)).returning();
    return row ? rowToDelegateAssignment(row) : undefined;
  }

  async deleteDelegation(id: string): Promise<boolean> {
    const result = await this.db.delete(delegateAssignments).where(eq(delegateAssignments.id, id)).returning({ id: delegateAssignments.id });
    return result.length > 0;
  }

  // ── Travel Quotes ──────────────────────────────────────────────────────

  async getQuotes(requestId: string): Promise<TravelQuote[]> {
    const rows = await this.db.select().from(travelQuotes).where(eq(travelQuotes.requestId, requestId));
    return rows.map(rowToTravelQuote);
  }

  async getQuote(id: string): Promise<TravelQuote | undefined> {
    const [row] = await this.db.select().from(travelQuotes).where(eq(travelQuotes.id, id));
    return row ? rowToTravelQuote(row) : undefined;
  }

  async createQuote(quote: Omit<TravelQuote, "id" | "createdAt" | "updatedAt">): Promise<TravelQuote> {
    const id = `quote-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(travelQuotes)
      .values({
        id,
        requestId: quote.requestId,
        companyCode: (quote as any).companyCode ?? "itt001",
        vendorName: quote.vendorName,
        vendorEmail: quote.vendorEmail,
        quoteValue: quote.quoteValue.toString(),
        currency: quote.currency,
        pnr: quote.pnr || null,
        quoteExpiry: quote.quoteExpiry || null,
        notes: quote.notes || null,
        attachmentUrl: quote.attachmentUrl || null,
        createdBy: quote.createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return rowToTravelQuote(row);
  }

  async updateQuote(id: string, updates: Partial<TravelQuote>): Promise<TravelQuote | undefined> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.vendorName !== undefined) set.vendorName = updates.vendorName;
    if (updates.vendorEmail !== undefined) set.vendorEmail = updates.vendorEmail;
    if (updates.quoteValue !== undefined) set.quoteValue = updates.quoteValue.toString();
    if (updates.currency !== undefined) set.currency = updates.currency;
    if (updates.pnr !== undefined) set.pnr = updates.pnr;
    if (updates.quoteExpiry !== undefined) set.quoteExpiry = updates.quoteExpiry;
    if (updates.notes !== undefined) set.notes = updates.notes;
    if (updates.attachmentUrl !== undefined) set.attachmentUrl = updates.attachmentUrl;

    const [row] = await this.db.update(travelQuotes).set(set).where(eq(travelQuotes.id, id)).returning();
    return row ? rowToTravelQuote(row) : undefined;
  }

  async deleteQuote(id: string): Promise<boolean> {
    const result = await this.db.delete(travelQuotes).where(eq(travelQuotes.id, id)).returning({ id: travelQuotes.id });
    return result.length > 0;
  }

  // ── Quote Policies ─────────────────────────────────────────────────────

  async getQuotePolicy(): Promise<QuotePolicy | undefined> {
    const [row] = await this.db.select().from(quotePolicies);
    return row ? rowToQuotePolicy(row) : undefined;
  }

  async updateQuotePolicy(policyUpdates: Partial<QuotePolicy>): Promise<QuotePolicy> {
    const now = new Date();
    const existing = await this.getQuotePolicy();

    if (!existing) {
      const id = `policy-${randomUUID().slice(0, 8)}`;
      const [row] = await this.db
        .insert(quotePolicies)
        .values({
          id,
          companyCode: "itt001",
          name: policyUpdates.name ?? "Default Quote Policy",
          minQuotesDomestic: policyUpdates.minQuotesDomestic ?? 2,
          minQuotesInternational: policyUpdates.minQuotesInternational ?? 3,
          allowOverride: policyUpdates.allowOverride ?? true,
          overrideRoles: policyUpdates.overrideRoles ?? ["manager", "finance_admin"],
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return rowToQuotePolicy(row);
    }

    const set: Record<string, unknown> = { updatedAt: now };
    if (policyUpdates.name !== undefined) set.name = policyUpdates.name;
    if (policyUpdates.minQuotesDomestic !== undefined) set.minQuotesDomestic = policyUpdates.minQuotesDomestic;
    if (policyUpdates.minQuotesInternational !== undefined) set.minQuotesInternational = policyUpdates.minQuotesInternational;
    if (policyUpdates.allowOverride !== undefined) set.allowOverride = policyUpdates.allowOverride;
    if (policyUpdates.overrideRoles !== undefined) set.overrideRoles = policyUpdates.overrideRoles;

    const [row] = await this.db.update(quotePolicies).set(set).where(eq(quotePolicies.id, existing.id)).returning();
    return rowToQuotePolicy(row);
  }

  // ── Vendors ────────────────────────────────────────────────────────────

  async getVendors(status?: string, companyCode?: string | null): Promise<Vendor[]> {
    const conditions: ReturnType<typeof eq>[] = [];
    if (companyCode) conditions.push(eq(vendors.companyCode, companyCode));
    if (status) conditions.push(eq(vendors.status, status as any));
    if (conditions.length > 0) {
      return this.db.select().from(vendors).where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    return this.db.select().from(vendors);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [row] = await this.db.select().from(vendors).where(eq(vendors.id, id));
    return row;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = `vendor-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(vendors)
      .values({
        id,
        companyCode: vendor.companyCode ?? null,
        name: vendor.name,
        category: vendor.category || "Other",
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone || null,
        services: vendor.services,
        status: vendor.status || "pending_approval",
        proposedBy: vendor.proposedBy,
        proposedAt: vendor.proposedAt || now,
        approvedBy: vendor.approvedBy || null,
        approvedAt: vendor.approvedAt || null,
        rejectionReason: vendor.rejectionReason || null,
        suspensionReason: vendor.suspensionReason || null,
        performanceRating: vendor.performanceRating || null,
        performanceReviews: vendor.performanceReviews || null,
        notes: vendor.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const [row] = await this.db
      .update(vendors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return row;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const result = await this.db.delete(vendors).where(eq(vendors.id, id)).returning({ id: vendors.id });
    return result.length > 0;
  }

  // ── Email Templates ────────────────────────────────────────────────────

  async getEmailTemplates(category?: string, companyCode?: string | null): Promise<EmailTemplate[]> {
    const conditions: ReturnType<typeof eq>[] = [];
    if (companyCode) conditions.push(eq(emailTemplates.companyCode, companyCode));
    if (category) conditions.push(eq(emailTemplates.category, category as any));
    if (conditions.length > 0) {
      return this.db.select().from(emailTemplates).where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    return this.db.select().from(emailTemplates);
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [row] = await this.db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return row;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = `template-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(emailTemplates)
      .values({ id, ...template, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const [row] = await this.db
      .update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return row;
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning({ id: emailTemplates.id });
    return result.length > 0;
  }

  // ── Per Diem Rates ─────────────────────────────────────────────────────

  async getPerDiemRates(companyCode?: string | null): Promise<PerDiemRate[]> {
    if (companyCode) {
      return this.db.select().from(perDiemRates).where(eq(perDiemRates.companyCode, companyCode));
    }
    return this.db.select().from(perDiemRates);
  }

  async getPerDiemRate(id: string): Promise<PerDiemRate | undefined> {
    const [row] = await this.db.select().from(perDiemRates).where(eq(perDiemRates.id, id));
    return row;
  }

  async getActivePerDiemRate(location: string, date: Date): Promise<PerDiemRate | undefined> {
    const rows = await this.db
      .select()
      .from(perDiemRates)
      .where(
        and(
          eq(perDiemRates.location, location),
          lte(perDiemRates.effectiveFrom, date),
          or(isNull(perDiemRates.effectiveTo), gte(perDiemRates.effectiveTo!, date)),
        ),
      );
    return rows[0];
  }

  async createPerDiemRate(rate: InsertPerDiemRate): Promise<PerDiemRate> {
    const id = `rate-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(perDiemRates)
      .values({ id, ...rate, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async updatePerDiemRate(id: string, updates: Partial<PerDiemRate>): Promise<PerDiemRate | undefined> {
    const [row] = await this.db
      .update(perDiemRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(perDiemRates.id, id))
      .returning();
    return row;
  }

  async deletePerDiemRate(id: string): Promise<boolean> {
    const result = await this.db.delete(perDiemRates).where(eq(perDiemRates.id, id)).returning({ id: perDiemRates.id });
    return result.length > 0;
  }

  // ── Travel Policies ────────────────────────────────────────────────────

  async getTravelPolicies(companyCode?: string | null): Promise<TravelPolicy[]> {
    if (companyCode) {
      return this.db.select().from(travelPolicies).where(eq(travelPolicies.companyCode, companyCode));
    }
    return this.db.select().from(travelPolicies);
  }

  async getTravelPolicy(id: string): Promise<TravelPolicy | undefined> {
    const [row] = await this.db.select().from(travelPolicies).where(eq(travelPolicies.id, id));
    return row;
  }

  async createTravelPolicy(policy: InsertTravelPolicy): Promise<TravelPolicy> {
    const id = `policy-tp-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(travelPolicies)
      .values({ id, ...policy, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async updateTravelPolicy(id: string, updates: Partial<TravelPolicy>): Promise<TravelPolicy | undefined> {
    const [row] = await this.db
      .update(travelPolicies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(travelPolicies.id, id))
      .returning();
    return row;
  }

  async deleteTravelPolicy(id: string): Promise<boolean> {
    const result = await this.db.delete(travelPolicies).where(eq(travelPolicies.id, id)).returning({ id: travelPolicies.id });
    return result.length > 0;
  }

  // ── Workflow Rules ─────────────────────────────────────────────────────

  async getWorkflowRules(companyCode?: string | null): Promise<WorkflowRule[]> {
    if (companyCode) {
      return this.db.select().from(workflowRules).where(eq(workflowRules.companyCode, companyCode));
    }
    return this.db.select().from(workflowRules);
  }

  async getWorkflowRule(id: string): Promise<WorkflowRule | undefined> {
    const [row] = await this.db.select().from(workflowRules).where(eq(workflowRules.id, id));
    return row;
  }

  async createWorkflowRule(rule: InsertWorkflowRule): Promise<WorkflowRule> {
    const id = `workflow-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(workflowRules)
      .values({ id, ...rule, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async updateWorkflowRule(id: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule | undefined> {
    const [row] = await this.db
      .update(workflowRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflowRules.id, id))
      .returning();
    return row;
  }

  async deleteWorkflowRule(id: string): Promise<boolean> {
    const result = await this.db.delete(workflowRules).where(eq(workflowRules.id, id)).returning({ id: workflowRules.id });
    return result.length > 0;
  }

  // ── System Notifications ───────────────────────────────────────────────

  async getSystemNotifications(published?: boolean, companyCode?: string | null): Promise<SystemNotification[]> {
    const conditions = [];
    if (companyCode) conditions.push(eq(systemNotifications.companyCode, companyCode));
    if (published !== undefined) conditions.push(eq(systemNotifications.isPublished, published));
    if (conditions.length > 0) {
      return this.db.select().from(systemNotifications).where(and(...conditions));
    }
    return this.db.select().from(systemNotifications);
  }

  async getSystemNotification(id: string): Promise<SystemNotification | undefined> {
    const [row] = await this.db.select().from(systemNotifications).where(eq(systemNotifications.id, id));
    return row;
  }

  async createSystemNotification(notification: InsertSystemNotification): Promise<SystemNotification> {
    const id = `notif-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(systemNotifications)
      .values({ id, ...notification, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async updateSystemNotification(id: string, updates: Partial<SystemNotification>): Promise<SystemNotification | undefined> {
    const [row] = await this.db
      .update(systemNotifications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systemNotifications.id, id))
      .returning();
    return row;
  }

  async deleteSystemNotification(id: string): Promise<boolean> {
    const result = await this.db.delete(systemNotifications).where(eq(systemNotifications.id, id)).returning({ id: systemNotifications.id });
    return result.length > 0;
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────

  async getAuditLogs(companyCode?: string, entityType?: string, entityId?: string): Promise<AuditLog[]> {
    const conditions = [];
    if (companyCode) conditions.push(eq(auditLogs.companyCode, companyCode));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId));

    if (conditions.length > 0) {
      return this.db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.timestamp));
    }
    return this.db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLog(id: string): Promise<AuditLog | undefined> {
    const [row] = await this.db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return row;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = `audit-${randomUUID().slice(0, 8)}`;
    const [row] = await this.db
      .insert(auditLogs)
      .values({ id, ...log, timestamp: new Date() })
      .returning();
    return row;
  }

  // ── Expense Claims ─────────────────────────────────────────────────────

  async getExpenseClaims(requestId?: string): Promise<ExpenseClaim[]> {
    if (requestId) {
      const rows = await this.db
        .select()
        .from(expenseClaims)
        .where(eq(expenseClaims.requestId, requestId))
        .orderBy(desc(expenseClaims.createdAt));
      return rows.map(rowToExpenseClaim);
    }
    const rows = await this.db.select().from(expenseClaims).orderBy(desc(expenseClaims.createdAt));
    return rows.map(rowToExpenseClaim);
  }

  async getExpenseClaim(id: string): Promise<ExpenseClaim | undefined> {
    const [row] = await this.db.select().from(expenseClaims).where(eq(expenseClaims.id, id));
    return row ? rowToExpenseClaim(row) : undefined;
  }

  async createExpenseClaim(claim: Omit<ExpenseClaim, "id" | "createdAt" | "updatedAt">): Promise<ExpenseClaim> {
    const id = `claim-${randomUUID().slice(0, 8)}`;
    const companyCode = (claim as any).companyCode ?? "itt001";
    const tclNumber = await this.generateTCLNumber(companyCode);
    const now = new Date();
    const [row] = await this.db
      .insert(expenseClaims)
      .values({
        id,
        tclNumber,
        requestId: claim.requestId,
        travelRequestRef: claim.travelRequestRef || null,
        companyCode,
        employeeId: claim.employeeId,
        employeeName: claim.employeeName,
        totalAmount: claim.totalAmount.toString(),
        currency: claim.currency,
        status: claim.status,
        submittedAt: claim.submittedAt ? new Date(claim.submittedAt) : null,
        reviewedAt: claim.reviewedAt ? new Date(claim.reviewedAt) : null,
        reviewedBy: claim.reviewedBy || null,
        reviewNotes: claim.reviewNotes || null,
        lineItems: claim.lineItems,
        reconciliation: claim.reconciliation || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return rowToExpenseClaim(row);
  }

  async updateExpenseClaim(id: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | undefined> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.status !== undefined) set.status = updates.status;
    if (updates.lineItems !== undefined) set.lineItems = updates.lineItems;
    if (updates.totalAmount !== undefined) set.totalAmount = updates.totalAmount.toString();
    if (updates.currency !== undefined) set.currency = updates.currency;
    if (updates.submittedAt !== undefined) set.submittedAt = updates.submittedAt ? new Date(updates.submittedAt) : null;
    if (updates.reviewedAt !== undefined) set.reviewedAt = updates.reviewedAt ? new Date(updates.reviewedAt) : null;
    if (updates.reviewedBy !== undefined) set.reviewedBy = updates.reviewedBy;
    if (updates.reviewNotes !== undefined) set.reviewNotes = updates.reviewNotes;
    if (updates.reconciliation !== undefined) set.reconciliation = updates.reconciliation;
    if (updates.travelRequestRef !== undefined) set.travelRequestRef = updates.travelRequestRef;

    const [row] = await this.db.update(expenseClaims).set(set).where(eq(expenseClaims.id, id)).returning();
    return row ? rowToExpenseClaim(row) : undefined;
  }

  async deleteExpenseClaim(id: string): Promise<boolean> {
    const result = await this.db.delete(expenseClaims).where(eq(expenseClaims.id, id)).returning({ id: expenseClaims.id });
    return result.length > 0;
  }

  // ── Company Settings ───────────────────────────────────────────────────

  async getCompanySettings(companyCode: string): Promise<CompanySettings | undefined> {
    const [row] = await this.db.select().from(companySettings).where(eq(companySettings.companyCode, companyCode));
    return row;
  }

  async upsertCompanySettings(data: InsertCompanySettings): Promise<CompanySettings> {
    const now = new Date();
    const [row] = await this.db
      .insert(companySettings)
      .values({ id: randomUUID(), ...data, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: companySettings.companyCode,
        set: {
          displayName: data.displayName,
          contactEmail: data.contactEmail,
          timezone: data.timezone,
          logoUrl: data.logoUrl,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  // ── Cost Centres ───────────────────────────────────────────────────────

  async getCostCentreRecords(companyCode: string): Promise<CostCentreRecord[]> {
    return this.db.select().from(costCentres).where(eq(costCentres.companyCode, companyCode));
  }

  async getCostCentreRecord(id: string): Promise<CostCentreRecord | undefined> {
    const [row] = await this.db.select().from(costCentres).where(eq(costCentres.id, id));
    return row;
  }

  async createCostCentreRecord(data: InsertCostCentreRecord): Promise<CostCentreRecord> {
    const id = `cc-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await this.db
      .insert(costCentres)
      .values({ id, ...data, createdAt: now, updatedAt: now })
      .returning();
    return row;
  }

  async updateCostCentreRecord(id: string, updates: Partial<CostCentreRecord>): Promise<CostCentreRecord | undefined> {
    const [row] = await this.db
      .update(costCentres)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(costCentres.id, id))
      .returning();
    return row;
  }

  async deleteCostCentreRecord(id: string): Promise<boolean> {
    const result = await this.db.delete(costCentres).where(eq(costCentres.id, id)).returning({ id: costCentres.id });
    return result.length > 0;
  }
}
