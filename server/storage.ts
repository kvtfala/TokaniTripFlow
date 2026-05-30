import { DbStorage } from "./dbStorage";
import { db } from "./db";
import { 
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
} from "@shared/schema";
import type { TravelRequest, DelegateAssignment, CostCentre, HistoryEntry, TravelQuote, QuotePolicy, ExpenseClaim } from "@shared/types";
import { randomUUID } from "crypto";

export interface IStorage {
  // Replit Auth Integration - User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Travel Requests
  getTravelRequests(): Promise<TravelRequest[]>;
  getTravelRequest(id: string): Promise<TravelRequest | undefined>;
  createTravelRequest(request: Omit<TravelRequest, "id">): Promise<TravelRequest>;
  updateTravelRequest(id: string, updates: Partial<TravelRequest>): Promise<TravelRequest | undefined>;
  
  // Delegations
  getDelegations(): Promise<DelegateAssignment[]>;
  getDelegation(id: string): Promise<DelegateAssignment | undefined>;
  createDelegation(delegation: Omit<DelegateAssignment, "id">): Promise<DelegateAssignment>;
  updateDelegation(id: string, updates: Partial<DelegateAssignment>): Promise<DelegateAssignment | undefined>;
  deleteDelegation(id: string): Promise<boolean>;
  
  // Travel Quotes (RFQ Workflow)
  getQuotes(requestId: string): Promise<TravelQuote[]>;
  getQuote(id: string): Promise<TravelQuote | undefined>;
  createQuote(quote: Omit<TravelQuote, "id" | "createdAt" | "updatedAt">): Promise<TravelQuote>;
  updateQuote(id: string, updates: Partial<TravelQuote>): Promise<TravelQuote | undefined>;
  deleteQuote(id: string): Promise<boolean>;
  
  // Quote Policies
  getQuotePolicy(): Promise<QuotePolicy | undefined>;
  updateQuotePolicy(policy: Partial<QuotePolicy>): Promise<QuotePolicy>;
  
  // Admin Portal - Vendors
  // companyCode is optional by design: null/undefined = platform super_admin bypass (sees all tenants)
  getVendors(status?: string, companyCode?: string | null): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;
  
  // Admin Portal - Email Templates
  // companyCode policy: null/undefined = platform super_admin bypass (no filter); string = tenant-scoped
  getEmailTemplates(category?: string, companyCode?: string | null): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;
  
  // Admin Portal - Per Diem Rates
  getPerDiemRates(companyCode?: string | null): Promise<PerDiemRate[]>;
  getPerDiemRate(id: string): Promise<PerDiemRate | undefined>;
  getActivePerDiemRate(location: string, date: Date): Promise<PerDiemRate | undefined>;
  createPerDiemRate(rate: InsertPerDiemRate): Promise<PerDiemRate>;
  updatePerDiemRate(id: string, updates: Partial<PerDiemRate>): Promise<PerDiemRate | undefined>;
  deletePerDiemRate(id: string): Promise<boolean>;
  
  // Admin Portal - Travel Policies
  getTravelPolicies(companyCode?: string | null): Promise<TravelPolicy[]>;
  getTravelPolicy(id: string): Promise<TravelPolicy | undefined>;
  createTravelPolicy(policy: InsertTravelPolicy): Promise<TravelPolicy>;
  updateTravelPolicy(id: string, updates: Partial<TravelPolicy>): Promise<TravelPolicy | undefined>;
  deleteTravelPolicy(id: string): Promise<boolean>;
  
  // Admin Portal - Workflow Rules
  getWorkflowRules(companyCode?: string | null): Promise<WorkflowRule[]>;
  getWorkflowRule(id: string): Promise<WorkflowRule | undefined>;
  createWorkflowRule(rule: InsertWorkflowRule): Promise<WorkflowRule>;
  updateWorkflowRule(id: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule | undefined>;
  deleteWorkflowRule(id: string): Promise<boolean>;
  
  // Admin Portal - System Notifications
  getSystemNotifications(published?: boolean, companyCode?: string | null): Promise<SystemNotification[]>;
  getSystemNotification(id: string): Promise<SystemNotification | undefined>;
  createSystemNotification(notification: InsertSystemNotification): Promise<SystemNotification>;
  updateSystemNotification(id: string, updates: Partial<SystemNotification>): Promise<SystemNotification | undefined>;
  deleteSystemNotification(id: string): Promise<boolean>;
  
  // Admin Portal - Audit Logs
  getAuditLogs(companyCode?: string, entityType?: string, entityId?: string): Promise<AuditLog[]>;
  getAuditLog(id: string): Promise<AuditLog | undefined>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Expense Claims
  getExpenseClaims(requestId?: string): Promise<ExpenseClaim[]>;
  getExpenseClaim(id: string): Promise<ExpenseClaim | undefined>;
  createExpenseClaim(claim: Omit<ExpenseClaim, "id" | "createdAt" | "updatedAt">): Promise<ExpenseClaim>;
  updateExpenseClaim(id: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | undefined>;
  deleteExpenseClaim(id: string): Promise<boolean>;

  // Admin Portal - Company Settings (per-tenant profile)
  // companyCode policy: null/undefined = platform super_admin bypass (no filter); string = tenant-scoped
  getCompanySettings(companyCode: string): Promise<CompanySettings | undefined>;
  upsertCompanySettings(data: InsertCompanySettings): Promise<CompanySettings>;

  // Admin Portal - Cost Centres (DB-backed)
  // companyCode policy: same as above
  getCostCentreRecords(companyCode: string): Promise<CostCentreRecord[]>;
  getCostCentreRecord(id: string): Promise<CostCentreRecord | undefined>;
  createCostCentreRecord(data: InsertCostCentreRecord): Promise<CostCentreRecord>;
  updateCostCentreRecord(id: string, updates: Partial<CostCentreRecord>): Promise<CostCentreRecord | undefined>;
  deleteCostCentreRecord(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private travelRequests: Map<string, TravelRequest>;
  private delegations: Map<string, DelegateAssignment>;
  private quotes: Map<string, TravelQuote>;
  private quotePolicy: QuotePolicy | undefined;
  
  // Admin Portal Maps
  private vendors: Map<string, Vendor>;
  private emailTemplates: Map<string, EmailTemplate>;
  private perDiemRates: Map<string, PerDiemRate>;
  private travelPolicies: Map<string, TravelPolicy>;
  private workflowRules: Map<string, WorkflowRule>;
  private systemNotifications: Map<string, SystemNotification>;
  private auditLogs: Map<string, AuditLog>;
  private expenseClaims: Map<string, ExpenseClaim>;
  private companySettingsMap: Map<string, CompanySettings>; // key = companyCode
  private costCentreRecords: Map<string, CostCentreRecord>;

  private ttrCounter: number = 0;
  private ttrYear: number = new Date().getFullYear();
  private tclCounter: number = 0;
  private tclYear: number = new Date().getFullYear();

  private generateTTRNumber(): string {
    const year = new Date().getFullYear();
    if (year !== this.ttrYear) { this.ttrYear = year; this.ttrCounter = 0; }
    return `TTR-${this.ttrYear}-${String(++this.ttrCounter).padStart(5, "0")}`;
  }

  private generateTCLNumber(): string {
    const year = new Date().getFullYear();
    if (year !== this.tclYear) { this.tclYear = year; this.tclCounter = 0; }
    return `TCL-${this.tclYear}-${String(++this.tclCounter).padStart(5, "0")}`;
  }

  constructor() {
    this.users = new Map();
    this.travelRequests = new Map();
    this.delegations = new Map();
    this.quotes = new Map();
    
    // Admin Portal Maps
    this.vendors = new Map();
    this.emailTemplates = new Map();
    this.perDiemRates = new Map();
    this.travelPolicies = new Map();
    this.workflowRules = new Map();
    this.systemNotifications = new Map();
    this.auditLogs = new Map();
    this.expenseClaims = new Map();
    this.companySettingsMap = new Map();
    this.costCentreRecords = new Map();
    
    // Seed with sample data
    this.seedSampleData();
    this.seedQuotePolicy();
  }

  private seedSampleData() {
    // Island Travel Technologies Demo User
    // DEMO CREDENTIALS (for demo environment only):
    //   Company Code: itt001
    //   Email: desmond.bale@islandtraveltech.com
    //   Role: super_admin (full admin portal access)
    
    // All demo users share the same bcrypt-hashed password
    const DEMO_HASH = "$2b$10$btwIziGooE5YvHpoZJxjjeYgqya3zJPk2EWmSmW.p2/Ck6r64rUGS";

    const testUsers: User[] = [
      {
        id: "user-itt-manager-001",
        email: "desmond.bale@islandtraveltech.com",
        firstName: "Desmond",
        lastName: "Bale",
        profileImageUrl: null,
        role: "super_admin",
        companyCode: "itt001",
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date("2026-03-30T08:00:00Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "user-itt-employee-001",
        email: "jone.ratudina@islandtraveltech.com",
        firstName: "Jone",
        lastName: "Ratudina",
        profileImageUrl: null,
        role: "employee",
        companyCode: "itt001",
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date("2026-03-29T09:15:00Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "user-itt-coordinator-001",
        email: "litia.vuniyayawa@islandtraveltech.com",
        firstName: "Litia",
        lastName: "Vuniyayawa",
        profileImageUrl: null,
        role: "coordinator",
        companyCode: "itt001",
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date("2026-03-30T07:30:00Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "user-itt-manager-002",
        email: "tomasi.ravouvou@islandtraveltech.com",
        firstName: "Tomasi",
        lastName: "Ravouvou",
        profileImageUrl: null,
        role: "manager",
        companyCode: "itt001",
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date("2026-03-28T14:00:00Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "user-itt-finance-001",
        email: "mere.delana@islandtraveltech.com",
        firstName: "Mere",
        lastName: "Delana",
        profileImageUrl: null,
        role: "finance_admin",
        companyCode: "itt001",
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date("2026-03-30T08:45:00Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: "user-itt-travel-001",
        email: "nemani.tui@islandtraveltech.com",
        firstName: "Nemani",
        lastName: "Tui",
        profileImageUrl: null,
        role: "travel_admin",
        companyCode: "itt001",
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date("2026-03-29T11:20:00Z"),
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    // ── Tuvalu High Commission Demo Users ──────────────────────────────────
    const thcUsers: User[] = [
      {
        id: 'user-thc-employee-001',
        email: 'peni.taufa@tuvaluhighcomm.demo',
        firstName: 'Peni',
        lastName: 'Taufa',
        profileImageUrl: null,
        role: 'employee',
        companyCode: 'thc001',
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date('2026-04-14T08:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
      {
        id: 'user-thc-manager-001',
        email: 'semisi.pio@tuvaluhighcomm.demo',
        firstName: 'Semisi',
        lastName: 'Pio',
        profileImageUrl: null,
        role: 'manager',
        companyCode: 'thc001',
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date('2026-04-26T09:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    // ── Kiribati High Commission Demo Users ──────────────────────────────────
    const khcUsers: User[] = [
      {
        id: 'user-khc-employee-001',
        email: 'tearia.tabai@kiribatihighcomm.demo',
        firstName: 'Tearia',
        lastName: 'Tabai',
        profileImageUrl: null,
        role: 'employee',
        companyCode: 'khc001',
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date('2026-04-08T09:30:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
      {
        id: 'user-khc-manager-001',
        email: 'bwere.ieang@kiribatihighcomm.demo',
        firstName: 'Bwere',
        lastName: 'Ieang',
        profileImageUrl: null,
        role: 'manager',
        companyCode: 'khc001',
        passwordHash: DEMO_HASH,
        isActive: true,
        lastLogin: new Date('2026-04-25T10:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
    ];

    // Store all users (ITT + THC + KHC)
    testUsers.forEach(user => this.users.set(user.id, user));
    thcUsers.forEach(user => this.users.set(user.id, user));
    khcUsers.forEach(user => this.users.set(user.id, user));

    // Seed admin portal data
    this.seedAdminData();

    // Island Travel Technologies - Enterprise-scale demo dataset
    // 1,759 annual trips | FJD 2.82M annual spend | 480 employees | 11 departments
    const sampleRequests: TravelRequest[] = [
      {
        id: "req-001",
        ttrNumber: "TTR-2026-00001",
        employeeName: "Ratu Epeli Cakobau",
        employeeNumber: "ITT-BOD-001",
        position: "Chairman & CEO",
        department: "Board of Directors",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2026-03-05",
        endDate: "2026-03-12",
        emergencyContactName: "Lady Mere Cakobau",
        emergencyContactPhone: "+679 923 4567",
        countryRiskLevel: "low",
        purpose: "Island Travel Technologies annual strategic planning retreat with regional subsidiary directors",
        perDiem: { totalFJD: 2900, days: 6, mieFJD: 495, firstDayFJD: 371.25, middleDaysFJD: 1980, lastDayFJD: 371.25 },
        visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
        status: "approved",
        submittedAt: "2025-10-15T10:30:00Z",
        costCentre: { code: "100-BOD", name: "Board of Directors" },
        fundingType: "advance",
        approverFlow: ["finance_admin"],
        approverIndex: 1,
        history: [
          { ts: "2025-10-15T10:30:00Z", actor: "employee", action: "SUBMIT", note: "Annual executive retreat - CEO office" },
          { ts: "2025-10-16T09:15:00Z", actor: "finance_admin", action: "APPROVE", note: "Board-level travel approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: true,
        costBreakdown: {
          flights: 2500,
          accommodation: 2400,
          groundTransfers: 180,
          visaFees: 250,
          perDiem: 2900,
          totalCost: 8230
        },
      },
      {
        id: "req-002",
        ttrNumber: "TTR-2026-00002",
        employeeName: "Litiana Ravouvou",
        employeeNumber: "ITT-EXE-012",
        position: "Chief Operating Officer",
        department: "Executive Management",
        employeeId: "employee",
        destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
        startDate: "2026-03-06",
        endDate: "2026-03-10",
        countryRiskLevel: "low",
        purpose: "ITT subsidiary acquisition due diligence and regional expansion planning with NZ partners",
        perDiem: { totalFJD: 2300, days: 5, mieFJD: 470, firstDayFJD: 352.5, middleDaysFJD: 1410, lastDayFJD: 352.5 },
        visaCheck: { status: "OK", message: "No visa required for New Zealand citizens visiting NZ." },
        status: "approved",
        submittedAt: "2025-10-12T11:00:00Z",
        costCentre: { code: "200-EXE", name: "Executive Management" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-12T11:00:00Z", actor: "employee", action: "SUBMIT", note: "Critical M&A due diligence - COO" },
          { ts: "2025-10-13T10:30:00Z", actor: "manager", action: "APPROVE", note: "Executive-level strategic initiative approved" },
          { ts: "2025-10-13T15:45:00Z", actor: "finance_admin", action: "APPROVE", note: "High-value travel approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        costBreakdown: {
          flights: 1800,
          accommodation: 1750,
          groundTransfers: 140,
          perDiem: 2300,
          totalCost: 5990
        },
      },
      {
        id: "req-003",
        ttrNumber: "TTR-2026-00003",
        employeeName: "Jone Navuso",
        employeeNumber: "ITT-TRV-047",
        position: "Travel Booking Specialist",
        department: "Travel Operations",
        employeeId: "employee",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        startDate: "2026-03-16",
        endDate: "2026-03-19",
        emergencyContactName: "Ana Navuso",
        emergencyContactPhone: "+679 934 5678",
        countryRiskLevel: "low",
        purpose: "Corporate travel vendor negotiations and annual contract renewals at Nadi Airport hub",
        perDiem: { totalFJD: 1250, days: 4, mieFJD: 320, firstDayFJD: 240, middleDaysFJD: 640, lastDayFJD: 240 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
        status: "approved",
        submittedAt: "2025-10-10T09:00:00Z",
        costCentre: { code: "300-TRV", name: "Travel Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-10T09:00:00Z", actor: "employee", action: "SUBMIT", note: "Vendor contract renewal meetings scheduled" },
          { ts: "2025-10-10T13:20:00Z", actor: "manager", action: "APPROVE", note: "Annual procurement cycle approved" },
          { ts: "2025-10-11T08:15:00Z", actor: "finance_admin", action: "APPROVE", note: "Budget allocated" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        costBreakdown: {
          flights: 350,
          accommodation: 800,
          groundTransfers: 90,
          perDiem: 1250,
          totalCost: 2490
        },
      },
      {
        id: "req-004",
        ttrNumber: "TTR-2026-00004",
        employeeName: "Setareki Tukana",
        employeeNumber: "ITT-VIS-023",
        position: "Visa Processing Manager",
        department: "Visa / Immigration Services",
        employeeId: "employee",
        destination: { code: "SIN", city: "Singapore", country: "Singapore" },
        startDate: "2025-11-20",
        endDate: "2025-11-23",
        purpose: "Regional immigration compliance workshop and embassy liaison meetings for ITT corporate visa program",
        perDiem: { totalFJD: 1100, days: 4, mieFJD: 280, firstDayFJD: 210, middleDaysFJD: 560, lastDayFJD: 210 },
        visaCheck: { status: "ACTION", message: "Electronic visa required. Apply online 2 weeks before travel." },
        status: "in_review",
        submittedAt: "2025-10-18T14:30:00Z",
        costCentre: { code: "400-VIS", name: "Visa / Immigration Services" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 0,
        history: [
          { ts: "2025-10-18T14:30:00Z", actor: "employee", action: "SUBMIT", note: "Compliance training invitation received" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: false,
        costBreakdown: {
          flights: 2200,
          accommodation: 1520,
          visaFees: 150,
          perDiem: 1100,
          totalCost: 4970
        },
      },
      {
        id: "req-005",
        ttrNumber: "TTR-2026-00005",
        employeeName: "Mereoni Delai",
        employeeNumber: "ITT-CSR-089",
        position: "Customer Service Lead",
        department: "Customer Service / Reservations",
        employeeId: "employee",
        destination: { code: "SUV", city: "Suva", country: "Fiji" },
        startDate: "2026-03-13",
        endDate: "2026-03-15",
        emergencyContactName: "Ratu Peni Delai",
        emergencyContactPhone: "+679 956 7890",
        countryRiskLevel: "low",
        purpose: "ITT customer service excellence training and new reservation system rollout at Suva headquarters",
        perDiem: { totalFJD: 950, days: 3, mieFJD: 320, firstDayFJD: 240, middleDaysFJD: 320, lastDayFJD: 240 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
        status: "approved",
        submittedAt: "2025-10-14T08:45:00Z",
        costCentre: { code: "500-CSR", name: "Customer Service / Reservations" },
        fundingType: "reimbursement",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-14T08:45:00Z", actor: "employee", action: "SUBMIT", note: "System training mandatory for Q4 launch" },
          { ts: "2025-10-15T11:00:00Z", actor: "manager", action: "APPROVE", note: "Critical for service delivery" },
          { ts: "2025-10-15T16:30:00Z", actor: "finance_admin", action: "APPROVE", note: "Training budget approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        costBreakdown: {
          flights: 200,
          accommodation: 540,
          groundTransfers: 70,
          perDiem: 950,
          totalCost: 1760
        },
      },
      {
        id: "req-006",
        ttrNumber: "TTR-2026-00006",
        employeeName: "Tevita Raicebe",
        employeeNumber: "ITT-FIN-065",
        position: "Chief Financial Officer",
        department: "Finance & Accounting",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2025-12-01",
        endDate: "2025-12-04",
        purpose: "ITT Q4 financial review with regional auditors and strategic budget planning for FY2026",
        perDiem: { totalFJD: 1700, days: 4, mieFJD: 430, firstDayFJD: 322.5, middleDaysFJD: 860, lastDayFJD: 322.5 },
        visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
        status: "submitted",
        submittedAt: "2025-10-20T10:15:00Z",
        costCentre: { code: "600-FIN", name: "Finance & Accounting" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 0,
        history: [
          { ts: "2025-10-20T10:15:00Z", actor: "employee", action: "SUBMIT", note: "CFO quarterly financial review - critical" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: true,
        costBreakdown: {
          flights: 2500,
          accommodation: 1600,
          groundTransfers: 160,
          visaFees: 250,
          perDiem: 1700,
          totalCost: 6210
        },
      },
      {
        id: "req-007",
        ttrNumber: "TTR-2026-00007",
        employeeName: "Kalisi Radrodro",
        employeeNumber: "ITT-TEC-112",
        position: "Head of Data Analytics",
        department: "Technology & Data",
        employeeId: "employee",
        destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
        startDate: "2026-03-04",
        endDate: "2026-03-09",
        countryRiskLevel: "low",
        purpose: "Enterprise data platform migration planning and cloud infrastructure vendor consultations",
        perDiem: { totalFJD: 1800, days: 4, mieFJD: 455, firstDayFJD: 341.25, middleDaysFJD: 910, lastDayFJD: 341.25 },
        visaCheck: { status: "OK", message: "No visa required for New Zealand." },
        status: "approved",
        submittedAt: "2025-10-08T13:20:00Z",
        costCentre: { code: "700-TEC", name: "Technology & Data" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-08T13:20:00Z", actor: "employee", action: "SUBMIT", note: "Strategic technology investment - data transformation" },
          { ts: "2025-10-09T09:00:00Z", actor: "manager", action: "APPROVE", note: "Critical infrastructure initiative approved" },
          { ts: "2025-10-09T14:45:00Z", actor: "finance_admin", action: "APPROVE", note: "Capital expenditure approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        costBreakdown: {
          flights: 1800,
          accommodation: 1400,
          groundTransfers: 130,
          perDiem: 1800,
          totalCost: 5130
        },
      },
      {
        id: "req-008",
        ttrNumber: "TTR-2026-00008",
        employeeName: "Roshni Lal",
        employeeNumber: "ITT-MKT-134",
        position: "Regional Marketing Director",
        department: "Marketing & Sales",
        employeeId: "employee",
        destination: { code: "SIN", city: "Singapore", country: "Singapore" },
        startDate: "2025-11-25",
        endDate: "2025-11-29",
        purpose: "Island Travel Technologies brand launch campaign planning and regional distributor partnership summit",
        perDiem: { totalFJD: 1950, days: 5, mieFJD: 395, firstDayFJD: 296.25, middleDaysFJD: 1185, lastDayFJD: 296.25 },
        visaCheck: { status: "ACTION", message: "Electronic visa required. Apply online 2 weeks before travel." },
        status: "rejected",
        submittedAt: "2025-10-17T09:30:00Z",
        costCentre: { code: "800-MKT", name: "Marketing & Sales" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 1,
        history: [
          { ts: "2025-10-17T09:30:00Z", actor: "employee", action: "SUBMIT", note: "Major brand launch - regional marketing initiative" },
          { ts: "2025-10-18T11:15:00Z", actor: "manager", action: "REJECT", note: "Postponed to Q1 2026 due to product launch delay" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: false,
        costBreakdown: {
          flights: 2200,
          accommodation: 1900,
          visaFees: 150,
          perDiem: 1950,
          totalCost: 6200
        },
      },
      {
        id: "req-009",
        ttrNumber: "TTR-2026-00009",
        employeeName: "Apisai Koroiadi",
        employeeNumber: "ITT-CMP-078",
        position: "Compliance & Risk Manager",
        department: "Compliance, Audit, Risk",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2026-03-10",
        endDate: "2026-03-14",
        countryRiskLevel: "low",
        purpose: "Regional compliance audit coordination and risk management framework implementation for ITT subsidiaries",
        perDiem: { totalFJD: 1600, days: 4, mieFJD: 405, firstDayFJD: 303.75, middleDaysFJD: 810, lastDayFJD: 303.75 },
        visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
        status: "approved",
        submittedAt: "2025-10-11T15:00:00Z",
        costCentre: { code: "900-CMP", name: "Compliance, Audit, Risk" },
        fundingType: "reimbursement",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-11T15:00:00Z", actor: "employee", action: "SUBMIT", note: "Mandatory regulatory compliance audit" },
          { ts: "2025-10-12T10:00:00Z", actor: "manager", action: "APPROVE", note: "Critical for audit certification" },
          { ts: "2025-10-12T16:20:00Z", actor: "finance_admin", action: "APPROVE", note: "Compliance budget approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: false,
        costBreakdown: {
          flights: 2500,
          accommodation: 1600,
          visaFees: 250,
          perDiem: 1600,
          totalCost: 5950
        },
      },
      {
        id: "req-010",
        ttrNumber: "TTR-2026-00010",
        employeeName: "Salome Tawake",
        employeeNumber: "ITT-ADM-091",
        position: "Head of Human Resources",
        department: "Administration & HR",
        employeeId: "employee",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        startDate: "2025-12-05",
        endDate: "2025-12-07",
        purpose: "ITT annual HR strategy planning and workforce development initiatives for 480-employee corporate expansion",
        perDiem: { totalFJD: 1200, days: 3, mieFJD: 405, firstDayFJD: 303.75, middleDaysFJD: 405, lastDayFJD: 303.75 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
        status: "submitted",
        submittedAt: "2025-10-21T08:00:00Z",
        costCentre: { code: "1000-ADM", name: "Administration & HR" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 0,
        history: [
          { ts: "2025-10-21T08:00:00Z", actor: "employee", action: "SUBMIT", note: "Annual HR strategic planning session" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        costBreakdown: {
          flights: 350,
          accommodation: 600,
          groundTransfers: 85,
          perDiem: 1200,
          totalCost: 2235
        },
      },
      {
        id: "req-011",
        ttrNumber: "TTR-2026-00011",
        employeeName: "Viliame Koroi",
        employeeNumber: "ITT-SUB-145",
        position: "Subsidiary Operations Director",
        department: "Subsidiaries (Combined)",
        employeeId: "employee",
        destination: { code: "APW", city: "Apia", country: "Samoa" },
        startDate: "2026-03-03",
        endDate: "2026-03-18",
        emergencyContactName: "Losalini Koroi",
        emergencyContactPhone: "+679 990 1234",
        countryRiskLevel: "low",
        purpose: "Island Travel Technologies subsidiary coordination and regional market expansion strategy for Samoa operations",
        perDiem: { totalFJD: 1350, days: 4, mieFJD: 340, firstDayFJD: 255, middleDaysFJD: 680, lastDayFJD: 255 },
        visaCheck: { status: "OK", message: "No visa required for regional Pacific travel." },
        status: "approved",
        submittedAt: "2025-10-09T14:00:00Z",
        costCentre: { code: "1100-SUB", name: "Subsidiaries (Combined)" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-09T14:00:00Z", actor: "employee", action: "SUBMIT", note: "Regional subsidiary coordination - critical expansion" },
          { ts: "2025-10-10T09:30:00Z", actor: "manager", action: "APPROVE", note: "Strategic growth initiative approved" },
          { ts: "2025-10-10T15:00:00Z", actor: "finance_admin", action: "APPROVE", note: "Subsidiary budget approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        costBreakdown: {
          flights: 900,
          accommodation: 1000,
          groundTransfers: 100,
          perDiem: 1350,
          totalCost: 3350
        },
      },
    ];

    sampleRequests.forEach(req => this.travelRequests.set(req.id, req));
    // Resume TTR counter from the last seeded number
    this.ttrCounter = sampleRequests.length;

    // ── Tuvalu High Commission — Demo Travel Requests ──────────────────────
    const thcRequests: TravelRequest[] = [
      {
        id: 'thc-req-001', ttrNumber: 'THC-2026-00001', companyCode: 'thc001',
        employeeName: 'Mr. Peni Taufa', employeeNumber: 'THC-OFF-001',
        position: 'Third Secretary', department: 'Consular',
        employeeId: 'user-thc-employee-001',
        destination: { code: 'SUV', city: 'Suva', country: 'Fiji' },
        preferredRoute: 'Funafuti → Suva', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-04-14', endDate: '2026-04-16',
        emergencyContactName: 'Semisi Pio', emergencyContactPhone: '+688 20 123', countryRiskLevel: 'low',
        purpose: 'Official consultation with Fiji Ministry of Foreign Affairs and trade delegation meetings',
        perDiem: { totalFJD: 1050, days: 3, mieFJD: 350, firstDayFJD: 262.5, middleDaysFJD: 350, lastDayFJD: 262.5 },
        visaCheck: { status: 'OK', message: 'No visa required for Fiji.' },
        status: 'ticketed', submittedAt: '2026-03-25T08:00:00Z',
        costCentre: { code: 'THC-CON', name: 'Consular' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 1,
        reviewedAt: '2026-03-26T10:00:00Z', reviewedBy: 'user-thc-manager-001',
        history: [
          { ts: '2026-03-25T08:00:00Z', actor: 'user-thc-employee-001', action: 'SUBMIT', note: 'Consultation requested by Ministry of Foreign Affairs Fiji' },
          { ts: '2026-03-26T10:00:00Z', actor: 'user-thc-manager-001', action: 'APPROVE', note: 'Approved — official government consultation' },
          { ts: '2026-03-27T09:00:00Z', actor: 'user-thc-employee-001', action: 'TICKET', note: 'Air Pacific flight confirmed — FJ-801' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
        totalEstimatedBudget: 2100,
        costBreakdown: { flights: 680, accommodation: 370, groundTransfers: 80, perDiem: 1050, totalCost: 2100 },
      },
      {
        id: 'thc-req-002', ttrNumber: 'THC-2026-00002', companyCode: 'thc001',
        employeeName: 'Mr. Peni Taufa', employeeNumber: 'THC-OFF-001',
        position: 'Third Secretary', department: 'Political Affairs',
        employeeId: 'user-thc-employee-001',
        destination: { code: 'VLI', city: 'Port Vila', country: 'Vanuatu' },
        preferredRoute: 'Funafuti → Suva → Port Vila', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-05-20', endDate: '2026-05-24',
        emergencyContactName: 'Semisi Pio', emergencyContactPhone: '+688 20 123', countryRiskLevel: 'low',
        purpose: 'Pacific Islands Forum Dialogue on Climate Financing and Small Island Developing States priorities',
        perDiem: { totalFJD: 1750, days: 5, mieFJD: 350, firstDayFJD: 262.5, middleDaysFJD: 1050, lastDayFJD: 262.5 },
        visaCheck: { status: 'OK', message: 'No visa required for Vanuatu for Tuvalu passport holders.' },
        status: 'approved', submittedAt: '2026-04-28T09:00:00Z',
        costCentre: { code: 'THC-POL', name: 'Political Affairs' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 1,
        reviewedAt: '2026-04-29T11:00:00Z', reviewedBy: 'user-thc-manager-001',
        history: [
          { ts: '2026-04-28T09:00:00Z', actor: 'user-thc-employee-001', action: 'SUBMIT', note: 'PIF Dialogue — official delegation' },
          { ts: '2026-04-29T11:00:00Z', actor: 'user-thc-manager-001', action: 'APPROVE', note: 'Approved — strategic Pacific engagement' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
        totalEstimatedBudget: 3600,
        costBreakdown: { flights: 1400, accommodation: 900, groundTransfers: 120, perDiem: 1750, totalCost: 3600 },
      },
      {
        id: 'thc-req-003', ttrNumber: 'THC-2026-00003', companyCode: 'thc001',
        employeeName: 'Mr. Peni Taufa', employeeNumber: 'THC-OFF-001',
        position: 'Third Secretary', department: 'Consular',
        employeeId: 'user-thc-employee-001',
        destination: { code: 'DEL', city: 'New Delhi', country: 'India' },
        preferredRoute: 'Funafuti → Suva → Singapore → New Delhi', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-06-10', endDate: '2026-06-15',
        emergencyContactName: 'Semisi Pio', emergencyContactPhone: '+688 20 123', countryRiskLevel: 'low',
        purpose: 'Medical escort coordination and consular assistance for Tuvaluan nationals receiving medical treatment in India',
        perDiem: { totalFJD: 2100, days: 6, mieFJD: 350, firstDayFJD: 262.5, middleDaysFJD: 1400, lastDayFJD: 262.5 },
        visaCheck: { status: 'ACTION', message: 'Indian e-Visa required. Apply at least 4 business days before travel.' },
        status: 'submitted', submittedAt: '2026-05-10T10:00:00Z',
        costCentre: { code: 'THC-CON', name: 'Consular' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 0,
        history: [
          { ts: '2026-05-10T10:00:00Z', actor: 'user-thc-employee-001', action: 'SUBMIT', note: 'Urgent — medical escort for 3 Tuvaluan nationals' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
        totalEstimatedBudget: 5800,
        costBreakdown: { flights: 2800, accommodation: 1200, groundTransfers: 200, visaFees: 150, perDiem: 2100, totalCost: 5800 },
      },
      {
        id: 'thc-req-004', ttrNumber: 'THC-2026-00004', companyCode: 'thc001',
        employeeName: 'Mr. Semisi Pio', employeeNumber: 'THC-MGR-001',
        position: 'High Commissioner', department: 'Executive',
        employeeId: 'user-thc-manager-001',
        destination: { code: 'CBR', city: 'Canberra', country: 'Australia' },
        preferredRoute: 'Funafuti → Suva → Sydney → Canberra', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-06-02', endDate: '2026-06-05',
        emergencyContactName: 'Tuvalu Foreign Affairs', emergencyContactPhone: '+688 20 800', countryRiskLevel: 'low',
        purpose: 'Bilateral government meeting with Australian DFAT — climate resilience funding and migration pathways',
        perDiem: { totalFJD: 1800, days: 4, mieFJD: 450, firstDayFJD: 337.5, middleDaysFJD: 900, lastDayFJD: 337.5 },
        visaCheck: { status: 'ACTION', message: 'Australian visa or eVisitor required for official travel.' },
        status: 'in_review', submittedAt: '2026-05-08T08:00:00Z',
        costCentre: { code: 'THC-EXEC', name: 'Executive' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 0,
        history: [
          { ts: '2026-05-08T08:00:00Z', actor: 'user-thc-manager-001', action: 'SUBMIT', note: 'Bilateral meeting — DFAT scheduled by Australian High Commission Fiji' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
        totalEstimatedBudget: 6200,
        costBreakdown: { flights: 2800, accommodation: 1400, groundTransfers: 200, visaFees: 250, perDiem: 1800, totalCost: 6200 },
      },
    ];

    thcRequests.forEach(req => this.travelRequests.set(req.id, req));

    // ── Kiribati High Commission — Demo Travel Requests ───────────────────────
    const khcRequests: TravelRequest[] = [
      {
        id: 'khc-req-001', ttrNumber: 'KHC-2026-00001', companyCode: 'khc001',
        employeeName: 'Ms. Tearia Tabai', employeeNumber: 'KHC-OFF-001',
        position: 'Second Secretary', department: 'Consular',
        employeeId: 'user-khc-employee-001',
        destination: { code: 'TRW', city: 'Tarawa', country: 'Kiribati' },
        preferredRoute: 'Suva → Tarawa', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-04-08', endDate: '2026-04-12',
        emergencyContactName: 'Bwere Ieang', emergencyContactPhone: '+686 21 234', countryRiskLevel: 'low',
        purpose: 'Consular assistance visit and document processing for Kiribati nationals',
        perDiem: { totalFJD: 1600, days: 5, mieFJD: 320, firstDayFJD: 240, middleDaysFJD: 960, lastDayFJD: 240 },
        visaCheck: { status: 'OK', message: 'No visa required for Kiribati nationals visiting Tarawa.' },
        status: 'ticketed', submittedAt: '2026-03-18T09:30:00Z',
        costCentre: { code: 'KHC-CON', name: 'Consular' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 1,
        reviewedAt: '2026-03-19T10:00:00Z', reviewedBy: 'user-khc-manager-001',
        history: [
          { ts: '2026-03-18T09:30:00Z', actor: 'user-khc-employee-001', action: 'SUBMIT', note: 'Consular visit — 47 pending passport applications' },
          { ts: '2026-03-19T10:00:00Z', actor: 'user-khc-manager-001', action: 'APPROVE', note: 'Approved — routine consular cycle' },
          { ts: '2026-03-20T08:00:00Z', actor: 'user-khc-employee-001', action: 'TICKET', note: 'Air Kiribati flight confirmed' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
        totalEstimatedBudget: 2900,
        costBreakdown: { flights: 950, accommodation: 720, groundTransfers: 120, perDiem: 1600, totalCost: 2900 },
      },
      {
        id: 'khc-req-002', ttrNumber: 'KHC-2026-00002', companyCode: 'khc001',
        employeeName: 'Ms. Tearia Tabai', employeeNumber: 'KHC-OFF-001',
        position: 'Second Secretary', department: 'Environment',
        employeeId: 'user-khc-employee-001',
        destination: { code: 'NAN', city: 'Nadi', country: 'Fiji' },
        preferredRoute: 'South Tarawa → Nadi', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-05-06', endDate: '2026-05-09',
        emergencyContactName: 'Bwere Ieang', emergencyContactPhone: '+686 21 234', countryRiskLevel: 'low',
        purpose: 'Pacific Regional Climate and Ocean Resilience Conference — sea-level adaptation and loss and damage mechanisms',
        perDiem: { totalFJD: 1200, days: 4, mieFJD: 300, firstDayFJD: 225, middleDaysFJD: 600, lastDayFJD: 225 },
        visaCheck: { status: 'OK', message: 'No visa required for Fiji.' },
        status: 'approved', submittedAt: '2026-04-15T10:00:00Z',
        costCentre: { code: 'KHC-ENV', name: 'Environment' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 1,
        reviewedAt: '2026-04-16T09:00:00Z', reviewedBy: 'user-khc-manager-001',
        history: [
          { ts: '2026-04-15T10:00:00Z', actor: 'user-khc-employee-001', action: 'SUBMIT', note: 'Climate conference — Kiribati official delegation' },
          { ts: '2026-04-16T09:00:00Z', actor: 'user-khc-manager-001', action: 'APPROVE', note: 'Approved — priority climate engagement' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
        totalEstimatedBudget: 2700,
        costBreakdown: { flights: 1100, accommodation: 800, groundTransfers: 100, perDiem: 1200, totalCost: 2700 },
      },
      {
        id: 'khc-req-003', ttrNumber: 'KHC-2026-00003', companyCode: 'khc001',
        employeeName: 'Ms. Tearia Tabai', employeeNumber: 'KHC-OFF-001',
        position: 'Second Secretary', department: 'Multilateral',
        employeeId: 'user-khc-employee-001',
        destination: { code: 'JFK', city: 'New York', country: 'United States' },
        preferredRoute: 'South Tarawa → Nadi → Los Angeles → New York', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-09-22', endDate: '2026-09-27',
        emergencyContactName: 'Bwere Ieang', emergencyContactPhone: '+686 21 234', countryRiskLevel: 'low',
        purpose: 'UN General Assembly 81st Session side meetings — Pacific SIDS statement support and climate financing consultations',
        perDiem: { totalFJD: 2800, days: 6, mieFJD: 467, firstDayFJD: 350, middleDaysFJD: 1867, lastDayFJD: 350 },
        visaCheck: { status: 'ACTION', message: 'US B1/B2 visa or ESTA required. Official travel may require diplomatic visa.' },
        status: 'submitted', submittedAt: '2026-05-20T11:00:00Z',
        costCentre: { code: 'KHC-MLT', name: 'Multilateral' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 0,
        history: [
          { ts: '2026-05-20T11:00:00Z', actor: 'user-khc-employee-001', action: 'SUBMIT', note: 'UNGA — Kiribati delegation support, early submission for visa lead time' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
        totalEstimatedBudget: 9400,
        costBreakdown: { flights: 4800, accommodation: 2400, groundTransfers: 200, visaFees: 300, perDiem: 2800, totalCost: 9400 },
      },
      {
        id: 'khc-req-004', ttrNumber: 'KHC-2026-00004', companyCode: 'khc001',
        employeeName: 'Ms. Bwere Ieang', employeeNumber: 'KHC-MGR-001',
        position: 'High Commissioner', department: 'Executive',
        employeeId: 'user-khc-manager-001',
        destination: { code: 'APW', city: 'Apia', country: 'Samoa' },
        preferredRoute: 'South Tarawa → Nadi → Apia', travelMode: 'Air', suggestedModes: ['Air'],
        startDate: '2026-06-16', endDate: '2026-06-19',
        emergencyContactName: 'Kiribati Foreign Affairs', emergencyContactPhone: '+686 21 099', countryRiskLevel: 'low',
        purpose: 'Pacific Forum Officials Meeting (FOM) — preparatory session for 2026 Pacific Islands Forum Leaders Summit',
        perDiem: { totalFJD: 1500, days: 4, mieFJD: 375, firstDayFJD: 281.25, middleDaysFJD: 750, lastDayFJD: 281.25 },
        visaCheck: { status: 'OK', message: 'No visa required for Samoa.' },
        status: 'in_review', submittedAt: '2026-05-25T09:00:00Z',
        costCentre: { code: 'KHC-EXEC', name: 'Executive' }, fundingType: 'advance',
        approverFlow: ['manager'], approverIndex: 0,
        history: [
          { ts: '2026-05-25T09:00:00Z', actor: 'user-khc-manager-001', action: 'SUBMIT', note: 'FOM preparatory — High Commissioner attendance required' },
        ],
        needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
        totalEstimatedBudget: 3600,
        costBreakdown: { flights: 1600, accommodation: 900, groundTransfers: 120, perDiem: 1500, totalCost: 3600 },
      },
    ];

    khcRequests.forEach(req => this.travelRequests.set(req.id, req));

    // ─── Seed expense claims — THC + KHC ────────────────────────────────────
    const thcClaims: ExpenseClaim[] = [
      {
        id: 'claim-thc-001',
        tclNumber: 'TCL-THC-00001',
        requestId: 'thc-req-001',
        travelRequestRef: 'THC-2026-00001',
        companyCode: 'thc001',
        employeeId: 'user-thc-employee-001',
        employeeName: 'Mr. Peni Taufa',
        lineItems: [
          { id: 'li-thc-001-1', description: 'Air Pacific FJ-801 — Funafuti to Suva return', category: 'Flights', amount: 680, merchantName: 'Air Pacific', receiptDate: '2026-04-14' },
          { id: 'li-thc-001-2', description: 'Tanoa Plaza Hotel Suva — 2 nights', category: 'Accommodation', amount: 370, merchantName: 'Tanoa International Hotel', receiptDate: '2026-04-14' },
          { id: 'li-thc-001-3', description: 'Working meals — Ministry delegation', category: 'Meals', amount: 145, merchantName: 'Various Suva', receiptDate: '2026-04-15' },
          { id: 'li-thc-001-4', description: 'Taxi Suva CBD — Fijian Government complex', category: 'Transport (Local)', amount: 45, merchantName: 'Suva City Cabs', receiptDate: '2026-04-14' },
        ],
        totalAmount: 1240,
        currency: 'FJD',
        status: 'paid',
        submittedAt: '2026-04-20T10:00:00Z',
        reviewedAt: '2026-04-22T14:00:00Z',
        reviewedBy: 'Semisi Pio',
        reviewNotes: 'All official receipts verified. Payment processed.',
        createdAt: '2026-04-19T08:00:00Z',
        updatedAt: '2026-04-22T14:00:00Z',
      },
    ];

    const khcClaims: ExpenseClaim[] = [
      {
        id: 'claim-khc-001',
        tclNumber: 'TCL-KHC-00001',
        requestId: 'khc-req-001',
        travelRequestRef: 'KHC-2026-00001',
        companyCode: 'khc001',
        employeeId: 'user-khc-employee-001',
        employeeName: 'Ms. Tearia Tabai',
        lineItems: [
          { id: 'li-khc-001-1', description: 'Air Kiribati — Suva to Tarawa return', category: 'Flights', amount: 950, merchantName: 'Air Kiribati', receiptDate: '2026-04-08' },
          { id: 'li-khc-001-2', description: 'Otintaai Hotel Tarawa — 4 nights', category: 'Accommodation', amount: 720, merchantName: 'Otintaai Hotel', receiptDate: '2026-04-08' },
          { id: 'li-khc-001-3', description: 'Working meals — consular processing days', category: 'Meals', amount: 180, merchantName: 'Various Tarawa', receiptDate: '2026-04-09' },
          { id: 'li-khc-001-4', description: 'Ground transfers — airport and government offices', category: 'Transport (Local)', amount: 120, merchantName: 'Tarawa Transport', receiptDate: '2026-04-08' },
        ],
        totalAmount: 1970,
        currency: 'FJD',
        status: 'approved',
        submittedAt: '2026-04-16T09:00:00Z',
        reviewedAt: '2026-04-18T11:00:00Z',
        reviewedBy: 'Bwere Ieang',
        reviewNotes: 'Receipts verified. Approved for payment.',
        createdAt: '2026-04-15T16:00:00Z',
        updatedAt: '2026-04-18T11:00:00Z',
      },
    ];

    thcClaims.forEach(claim => this.expenseClaims.set(claim.id, claim));
    khcClaims.forEach(claim => this.expenseClaims.set(claim.id, claim));
    this.tclCounter = thcClaims.length + khcClaims.length;  }

  // Replit Auth Integration - User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? structuredClone(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(user => user.email === email);
    return user ? structuredClone(user) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = userData.id ? this.users.get(userData.id) : undefined;
    const now = new Date();
    
    if (existing) {
      // Update existing user
      const updated: User = {
        ...existing,
        ...userData,
        updatedAt: now,
      };
      this.users.set(existing.id, updated);
      return updated;
    } else {
      // Create new user
      const id = userData.id || randomUUID();
      const newUser: User = {
        id,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        role: userData.role || "employee",
        companyCode: userData.companyCode || null,
        passwordHash: userData.passwordHash || null,
        isActive: userData.isActive ?? true,
        lastLogin: userData.lastLogin ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(id, newUser);
      return newUser;
    }
  }

  async getTravelRequests(): Promise<TravelRequest[]> {
    return Array.from(this.travelRequests.values());
  }

  async getTravelRequest(id: string): Promise<TravelRequest | undefined> {
    return this.travelRequests.get(id);
  }

  async createTravelRequest(request: Omit<TravelRequest, "id">): Promise<TravelRequest> {
    const id = `req-${randomUUID().slice(0, 8)}`;
    const ttrNumber = this.generateTTRNumber();
    const newRequest: TravelRequest = {
      ...request,
      id,
      ttrNumber,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      approverIndex: 0,
      history: [
        {
          ts: new Date().toISOString(),
          actor: request.employeeId,
          action: "SUBMIT",
          note: "Travel request submitted",
        },
      ],
    };
    this.travelRequests.set(id, newRequest);
    return newRequest;
  }

  async updateTravelRequest(id: string, updates: Partial<TravelRequest>): Promise<TravelRequest | undefined> {
    const existing = this.travelRequests.get(id);
    if (!existing) return undefined;

    const updated: TravelRequest = { ...existing, ...updates };
    this.travelRequests.set(id, updated);
    return updated;
  }

  async getDelegations(): Promise<DelegateAssignment[]> {
    return Array.from(this.delegations.values());
  }

  async getDelegation(id: string): Promise<DelegateAssignment | undefined> {
    return this.delegations.get(id);
  }

  async createDelegation(delegation: Omit<DelegateAssignment, "id">): Promise<DelegateAssignment> {
    const id = `del-${randomUUID().slice(0, 8)}`;
    const newDelegation: DelegateAssignment = { ...delegation, id };
    this.delegations.set(id, newDelegation);
    return newDelegation;
  }

  async updateDelegation(id: string, updates: Partial<DelegateAssignment>): Promise<DelegateAssignment | undefined> {
    const existing = this.delegations.get(id);
    if (!existing) return undefined;

    const updated: DelegateAssignment = { ...existing, ...updates };
    this.delegations.set(id, updated);
    return updated;
  }

  async deleteDelegation(id: string): Promise<boolean> {
    return this.delegations.delete(id);
  }

  // Travel Quotes (RFQ Workflow)
  async getQuotes(requestId: string): Promise<TravelQuote[]> {
    return Array.from(this.quotes.values()).filter(q => q.requestId === requestId);
  }

  async getQuote(id: string): Promise<TravelQuote | undefined> {
    return this.quotes.get(id);
  }

  async createQuote(quote: Omit<TravelQuote, "id" | "createdAt" | "updatedAt">): Promise<TravelQuote> {
    const id = `quote-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const newQuote: TravelQuote = {
      ...quote,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.quotes.set(id, newQuote);
    return newQuote;
  }

  async updateQuote(id: string, updates: Partial<TravelQuote>): Promise<TravelQuote | undefined> {
    const existing = this.quotes.get(id);
    if (!existing) return undefined;

    const updated: TravelQuote = { 
      ...existing, 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.quotes.set(id, updated);
    return updated;
  }

  async deleteQuote(id: string): Promise<boolean> {
    return this.quotes.delete(id);
  }

  // Quote Policies
  async getQuotePolicy(): Promise<QuotePolicy | undefined> {
    return this.quotePolicy;
  }

  async updateQuotePolicy(policyUpdates: Partial<QuotePolicy>): Promise<QuotePolicy> {
    if (!this.quotePolicy) {
      // Create default policy if none exists
      this.quotePolicy = {
        id: "policy-001",
        name: "Default Quote Policy",
        minQuotesDomestic: 2,
        minQuotesInternational: 3,
        allowOverride: true,
        overrideRoles: ["manager", "finance_admin"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    this.quotePolicy = {
      ...this.quotePolicy,
      ...policyUpdates,
      updatedAt: new Date().toISOString(),
    };
    return this.quotePolicy;
  }

  private seedQuotePolicy() {
    // Seed default quote policy
    this.quotePolicy = {
      id: "policy-001",
      name: "Island Travel Technologies Quote Policy",
      minQuotesDomestic: 2,    // Domestic (within Fiji) requires 2 quotes
      minQuotesInternational: 3, // International requires 3 quotes
      allowOverride: true,
      overrideRoles: ["manager", "finance_admin"],
      createdAt: new Date("2025-01-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
    };
  }

  private seedAdminData() {
    const now = new Date("2025-01-01T00:00:00Z");
    const userId = "user-itt-manager-001";

    // Sample Vendors (5 total: 3 approved, 2 pending) — all scoped to ITT
    const sampleVendors: Vendor[] = [
      {
        id: "vendor-001",
        companyCode: "itt001",
        name: "Pacific Airways",
        category: "Airlines",
        contactEmail: "enquries@islandtravetech.com",
        contactPhone: "+679-672-0888",
        services: ["flights"],
        status: "approved",
        proposedBy: userId,
        proposedAt: now,
        approvedBy: userId,
        approvedAt: now,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: 4,
        performanceReviews: [{ rating: 4, comment: "Good on-time performance", date: "2025-06-15" }],
        notes: "Preferred domestic carrier - excellent on-time record",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "vendor-002",
        companyCode: "itt001",
        name: "Fiji Airways",
        category: "Airlines",
        contactEmail: "enquries@islandtravetech.com",
        contactPhone: "+679-672-0777",
        services: ["flights"],
        status: "approved",
        proposedBy: userId,
        proposedAt: now,
        approvedBy: userId,
        approvedAt: now,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: 5,
        performanceReviews: [{ rating: 5, comment: "Excellent service, always on time", date: "2025-08-20" }, { rating: 5, comment: "Top tier carrier", date: "2025-11-03" }],
        notes: "Primary international carrier - Star Alliance member",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "vendor-003",
        companyCode: "itt001",
        name: "Island Stays Hotels",
        category: "Hotels",
        contactEmail: "enquries@islandtravetech.com",
        contactPhone: "+679-330-1234",
        services: ["hotels"],
        status: "approved",
        proposedBy: userId,
        proposedAt: now,
        approvedBy: userId,
        approvedAt: now,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: 4,
        performanceReviews: [{ rating: 4, comment: "Good room quality, prompt billing", date: "2025-09-10" }],
        notes: "Corporate rate agreement in place",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "vendor-006",
        companyCode: "itt001",
        name: "Grand Pacific Events",
        category: "Events",
        contactEmail: "enquries@islandtravetech.com",
        contactPhone: "+679-331-9900",
        services: ["events"],
        status: "approved",
        proposedBy: userId,
        proposedAt: now,
        approvedBy: userId,
        approvedAt: now,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: 4,
        performanceReviews: [{ rating: 4, comment: "Great venue management", date: "2025-07-22" }],
        notes: "Corporate events and conference management",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "vendor-004",
        companyCode: "itt001",
        name: "QuickRide Car Rentals",
        category: "Car Rental",
        contactEmail: "enquries@islandtravetech.com",
        contactPhone: "+679-330-5678",
        services: ["car_rental"],
        status: "pending_approval",
        proposedBy: userId,
        proposedAt: now,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: null,
        performanceReviews: null,
        notes: "New vendor - awaiting contract review",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "vendor-005",
        companyCode: "itt001",
        name: "Travel Visa Express",
        category: "Visa Services",
        contactEmail: "enquries@islandtravetech.com",
        contactPhone: "+61-2-9555-1234",
        services: ["visa_services"],
        status: "pending_approval",
        proposedBy: userId,
        proposedAt: now,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: null,
        performanceReviews: null,
        notes: "Specialist in Pacific region visa processing",
        createdAt: now,
        updatedAt: now,
      },
    ];

    sampleVendors.forEach(vendor => this.vendors.set(vendor.id, vendor));

    // Sample Email Templates — all scoped to ITT
    const sampleTemplates: EmailTemplate[] = [
      {
        id: "template-001",
        companyCode: "itt001",
        name: "approval_notification",
        description: "Sent when a travel request needs approval",
        subject: "Travel Request Approval Required: {{travelerName}} - {{destination}}",
        body: `<p>Dear {{approverName}},</p>
<p>A travel request requires your approval:</p>
<ul>
<li><strong>Traveler:</strong> {{travelerName}}</li>
<li><strong>Destination:</strong> {{destination}}</li>
<li><strong>Dates:</strong> {{startDate}} to {{endDate}}</li>
<li><strong>Purpose:</strong> {{purpose}}</li>
<li><strong>Estimated Cost:</strong> FJD {{totalCost}}</li>
</ul>
<p>Please review and approve at your earliest convenience.</p>
<p>Best regards,<br>Tokani TripFlow</p>`,
        placeholders: ["approverName", "travelerName", "destination", "startDate", "endDate", "purpose", "totalCost"],
        category: "approval",
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "template-002",
        companyCode: "itt001",
        name: "booking_confirmation",
        description: "Sent when travel is booked by Travel Desk",
        subject: "Travel Booking Confirmed: {{destination}}",
        body: `<p>Dear {{travelerName}},</p>
<p>Your travel has been confirmed:</p>
<ul>
<li><strong>Destination:</strong> {{destination}}</li>
<li><strong>Dates:</strong> {{startDate}} to {{endDate}}</li>
<li><strong>Flight:</strong> {{flightDetails}}</li>
<li><strong>Hotel:</strong> {{hotelDetails}}</li>
<li><strong>PNR:</strong> {{pnr}}</li>
</ul>
<p>Please arrive at the airport 2 hours before departure.</p>
<p>Safe travels,<br>Tokani TripFlow</p>`,
        placeholders: ["travelerName", "destination", "startDate", "endDate", "flightDetails", "hotelDetails", "pnr"],
        category: "booking",
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "template-003",
        companyCode: "itt001",
        name: "booking_reminder",
        description: "Sent 48 hours before departure",
        subject: "Travel Reminder: Departure in 48 Hours",
        body: `<p>Dear {{travelerName}},</p>
<p>This is a friendly reminder that your travel to {{destination}} is coming up:</p>
<ul>
<li><strong>Departure:</strong> {{departureDate}} at {{departureTime}}</li>
<li><strong>Flight:</strong> {{flightNumber}}</li>
<li><strong>Check-in:</strong> Please arrive 2 hours before departure</li>
</ul>
<p>Have you completed your visa requirements?</p>
<p>Safe travels,<br>Tokani TripFlow</p>`,
        placeholders: ["travelerName", "destination", "departureDate", "departureTime", "flightNumber"],
        category: "reminder",
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    sampleTemplates.forEach(template => this.emailTemplates.set(template.id, template));

    // Sample Per Diem Rates — all scoped to ITT
    const sampleRates: PerDiemRate[] = [
      {
        id: "rate-001",
        companyCode: "itt001",
        location: "Fiji - Suva",
        locationCode: "SUV",
        dailyRate: "320.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem for capital city",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-002",
        companyCode: "itt001",
        location: "Fiji - Nadi",
        locationCode: "NAN",
        dailyRate: "320.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem for tourist hub",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-003",
        companyCode: "itt001",
        location: "Australia - Sydney",
        locationCode: "SYD",
        dailyRate: "495.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "International per diem - major city",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-004",
        companyCode: "itt001",
        location: "New Zealand - Auckland",
        locationCode: "AKL",
        dailyRate: "470.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "International per diem - Pacific region",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-005",
        companyCode: "itt001",
        location: "Singapore",
        locationCode: "SIN",
        dailyRate: "395.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "International per diem - Asia",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-006",
        companyCode: "itt001",
        location: "Fiji - Labasa",
        locationCode: "LBS",
        dailyRate: "300.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem - Vanua Levu northern region",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-007",
        companyCode: "itt001",
        location: "Fiji - Savusavu",
        locationCode: "SVU",
        dailyRate: "290.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem - Vanua Levu south coast",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-008",
        companyCode: "itt001",
        location: "Fiji - Taveuni",
        locationCode: "TVU",
        dailyRate: "290.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem - Garden Island",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-009",
        companyCode: "itt001",
        location: "Fiji - Lautoka",
        locationCode: "LTK",
        dailyRate: "300.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem - Sugar City, western Viti Levu",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rate-010",
        companyCode: "itt001",
        location: "Fiji - Nausori",
        locationCode: "NAU",
        dailyRate: "280.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "Domestic per diem - Rewa Delta area",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    sampleRates.forEach(rate => this.perDiemRates.set(rate.id, rate));

    // Sample Travel Policies — all scoped to ITT
    const samplePolicies: TravelPolicy[] = [
      {
        id: "policy-tp-001",
        companyCode: "itt001",
        name: "Advance Booking Requirement",
        description: "Minimum advance booking window for travel requests",
        policyType: "advance_booking",
        rules: {
          domestic: { days: 7, description: "Domestic travel must be booked 7 days in advance" },
          international: { days: 14, description: "International travel must be booked 14 days in advance" },
          exceptions: ["emergency", "urgent_business"]
        },
        isActive: true,
        priority: 8,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "policy-tp-002",
        companyCode: "itt001",
        name: "Finance Approval Threshold",
        description: "Cost thresholds that trigger finance review",
        policyType: "cost_threshold",
        rules: {
          thresholds: [
            { amount: 3000, currency: "FJD", approvers: ["manager"] },
            { amount: 5000, currency: "FJD", approvers: ["manager", "finance_admin"] }
          ],
          requireQuotes: { above: 2000, minQuotes: 2 }
        },
        isActive: true,
        priority: 9,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "policy-tp-003",
        companyCode: "itt001",
        name: "Domestic Transport Mode Preference",
        description: "For Fiji domestic travel, land transport must be used where practical (under 150 km road distance). Air travel requires justification for routes served by road.",
        policyType: "transport_mode",
        rules: {
          landThresholdKm: 150,
          islandRoutesAutoApproveAir: true,
          islandRoutes: ["SUV-LBS", "SUV-TVU", "SUV-SVU", "NAN-TVU"],
          exceptions: ["medical_emergency", "time_critical_operations"],
          preferredVendors: ["Fiji Airways", "Northern Air", "Pacific Transport"]
        },
        isActive: true,
        priority: 7,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "policy-tp-004",
        companyCode: "itt001",
        name: "Accommodation Budget Cap — Domestic Fiji",
        description: "Maximum nightly accommodation rates for domestic Fiji travel. Claims above these limits require Finance Admin written approval.",
        policyType: "accommodation_cap",
        rules: {
          caps: [
            { location: "Nadi / Denarau", maxNightlyFJD: 250, currency: "FJD" },
            { location: "Suva", maxNightlyFJD: 220, currency: "FJD" },
            { location: "Labasa / Savusavu / Taveuni", maxNightlyFJD: 180, currency: "FJD" },
            { location: "Lautoka / Nausori / Other Domestic", maxNightlyFJD: 150, currency: "FJD" }
          ],
          exceptionProcess: "Submit exception request to finance_admin with justification before booking",
          selfBookingAllowed: false
        },
        isActive: true,
        priority: 8,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    samplePolicies.forEach(policy => this.travelPolicies.set(policy.id, policy));

    // Sample Workflow Rules — all scoped to ITT
    const sampleWorkflows: WorkflowRule[] = [
      {
        id: "workflow-001",
        companyCode: "itt001",
        name: "High-Value Travel Approval",
        description: "Require finance review for trips over FJD 5,000",
        conditions: { costGreaterThan: 5000, currency: "FJD" },
        actions: { addApprover: "finance_admin", requireQuotes: 3 },
        stages: ["coordinator", "manager", "finance_admin"],
        isActive: true,
        priority: 9,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "workflow-002",
        companyCode: "itt001",
        name: "International Travel Workflow",
        description: "Multi-stage approval for international trips",
        conditions: { isInternational: true },
        actions: { requireVisaCheck: true, requireQuotes: 3 },
        stages: ["coordinator", "manager"],
        isActive: true,
        priority: 7,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    sampleWorkflows.forEach(workflow => this.workflowRules.set(workflow.id, workflow));

    // Sample System Notifications — all scoped to ITT
    const sampleNotifications: SystemNotification[] = [
      {
        id: "notif-001",
        companyCode: "itt001",
        title: "System Maintenance Scheduled",
        message: "Tokani TripFlow will undergo scheduled maintenance on Sunday, December 1st from 2:00 AM to 6:00 AM FJT. The system will be unavailable during this time.",
        type: "banner",
        severity: "warning",
        isPublished: true,
        publishedAt: now,
        expiresAt: new Date("2025-12-02T00:00:00Z"),
        targetRoles: null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    sampleNotifications.forEach(notif => this.systemNotifications.set(notif.id, notif));

    // Sample Audit Logs (history of admin actions) — ITT tenant
    const sampleAuditLogs: AuditLog[] = [
      {
        id: "audit-001",
        companyCode: "itt001",
        userId,
        userName: "Desmond Bale",
        action: "create",
        entityType: "vendor",
        entityId: "vendor-001",
        previousValue: null,
        newValue: { name: "Pacific Airways", status: "approved" },
        changes: null,
        metadata: { vendorName: "Pacific Airways" },
        ipAddress: null,
        timestamp: now,
      },
      {
        id: "audit-002",
        companyCode: "itt001",
        userId,
        userName: "Desmond Bale",
        action: "approve",
        entityType: "vendor",
        entityId: "vendor-001",
        previousValue: { status: "pending_approval" },
        newValue: { status: "approved" },
        changes: { status: { old: "pending_approval", new: "approved" } },
        metadata: { vendorName: "Pacific Airways", approvalDate: now },
        ipAddress: null,
        timestamp: now,
      },
    ];

    sampleAuditLogs.forEach(log => this.auditLogs.set(log.id, log));

    // ── Tuvalu High Commission admin seed records (thc001) ────────────────
    const thcUserId = 'user-thc-manager-001';
    const thcNow = new Date('2025-01-01T00:00:00Z');

    const thcVendors: Vendor[] = [
      {
        id: 'vendor-thc-001', companyCode: 'thc001', name: 'Air Pacific', category: 'Airlines',
        contactEmail: 'groups@airpacific.com', contactPhone: '+679-672-0888', services: ['flights'],
        status: 'approved', proposedBy: thcUserId, proposedAt: thcNow, approvedBy: thcUserId, approvedAt: thcNow,
        rejectionReason: null, suspensionReason: null, performanceRating: 5,
        performanceReviews: [{ rating: 5, comment: 'Reliable service on Funafuti-Suva route', date: '2025-03-10' }],
        notes: 'Primary carrier for Suva consultations', createdAt: thcNow, updatedAt: thcNow,
      },
      {
        id: 'vendor-thc-002', companyCode: 'thc001', name: 'Tanoa International Hotel', category: 'Hotels',
        contactEmail: 'reservations@tanoa.com.fj', contactPhone: '+679-331-1111', services: ['hotels'],
        status: 'approved', proposedBy: thcUserId, proposedAt: thcNow, approvedBy: thcUserId, approvedAt: thcNow,
        rejectionReason: null, suspensionReason: null, performanceRating: 4,
        performanceReviews: [{ rating: 4, comment: 'Good location for government meetings in Suva', date: '2025-04-15' }],
        notes: 'Preferred Suva accommodation', createdAt: thcNow, updatedAt: thcNow,
      },
    ];
    thcVendors.forEach(v => this.vendors.set(v.id, v));

    const thcTemplates: EmailTemplate[] = [
      {
        id: 'template-thc-001', companyCode: 'thc001', name: 'approval_notification',
        description: 'THC approval request notification',
        subject: 'Tuvalu High Commission — Travel Approval Required: {{travelerName}} to {{destination}}',
        body: '<p>Dear {{approverName}},</p><p>A Tuvalu High Commission travel request requires your approval.</p><ul><li><strong>Traveler:</strong> {{travelerName}}</li><li><strong>Destination:</strong> {{destination}}</li><li><strong>Dates:</strong> {{startDate}} to {{endDate}}</li><li><strong>Cost:</strong> FJD {{totalCost}}</li></ul><p>Regards,<br>THC TripFlow</p>',
        placeholders: ['approverName', 'travelerName', 'destination', 'startDate', 'endDate', 'totalCost'],
        category: 'approval', isActive: true, createdBy: thcUserId, createdAt: thcNow, updatedAt: thcNow,
      },
    ];
    thcTemplates.forEach(t => this.emailTemplates.set(t.id, t));

    const thcRates: PerDiemRate[] = [
      {
        id: 'rate-thc-001', companyCode: 'thc001', location: 'Fiji - Suva', locationCode: 'SUV',
        dailyRate: '350.00', currency: 'FJD', effectiveFrom: new Date('2025-01-01T00:00:00Z'), effectiveTo: null,
        notes: 'THC domestic per diem — Suva', createdBy: thcUserId, createdAt: thcNow, updatedAt: thcNow,
      },
      {
        id: 'rate-thc-002', companyCode: 'thc001', location: 'Australia', locationCode: 'CBR',
        dailyRate: '450.00', currency: 'FJD', effectiveFrom: new Date('2025-01-01T00:00:00Z'), effectiveTo: null,
        notes: 'THC international per diem — Australia', createdBy: thcUserId, createdAt: thcNow, updatedAt: thcNow,
      },
    ];
    thcRates.forEach(r => this.perDiemRates.set(r.id, r));

    const thcPolicies: TravelPolicy[] = [
      {
        id: 'policy-thc-001', companyCode: 'thc001', name: 'THC Advance Booking Policy',
        description: 'Minimum booking window for High Commission travel',
        policyType: 'advance_booking',
        rules: {
          domestic: { days: 7, description: 'Book domestic travel 7 days in advance' },
          international: { days: 14, description: 'Book international travel 14 days in advance' },
        },
        isActive: true, priority: 8, createdBy: thcUserId, createdAt: thcNow, updatedAt: thcNow,
      },
    ];
    thcPolicies.forEach(p => this.travelPolicies.set(p.id, p));

    const thcWorkflows: WorkflowRule[] = [
      {
        id: 'workflow-thc-001', companyCode: 'thc001', name: 'THC Manager Approval',
        description: 'All High Commission travel requires High Commissioner sign-off',
        conditions: {}, actions: { requireApproval: 'manager' }, stages: ['manager'],
        isActive: true, priority: 10, createdBy: thcUserId, createdAt: thcNow, updatedAt: thcNow,
      },
    ];
    thcWorkflows.forEach(w => this.workflowRules.set(w.id, w));

    const thcNotifications: SystemNotification[] = [
      {
        id: 'notif-thc-001', companyCode: 'thc001', title: 'Tuvalu High Commission Travel Portal',
        message: 'Welcome to the Tuvalu High Commission TripFlow portal. Submit and track official travel requests here.',
        type: 'banner', severity: 'info', isPublished: true, publishedAt: thcNow, expiresAt: null,
        targetRoles: null, createdBy: thcUserId, createdAt: thcNow, updatedAt: thcNow,
      },
    ];
    thcNotifications.forEach(n => this.systemNotifications.set(n.id, n));

    const thcAuditLogs: AuditLog[] = [
      {
        id: 'audit-thc-001', companyCode: 'thc001', userId: thcUserId, userName: 'Semisi Pio',
        action: 'create', entityType: 'vendor', entityId: 'vendor-thc-001',
        previousValue: null, newValue: { name: 'Air Pacific', status: 'approved' },
        changes: null, metadata: { vendorName: 'Air Pacific' }, ipAddress: null, timestamp: thcNow,
      },
    ];
    thcAuditLogs.forEach(log => this.auditLogs.set(log.id, log));

    // ── Kiribati High Commission admin seed records (khc001) ─────────────────
    const khcUserId = 'user-khc-manager-001';
    const khcNow = new Date('2025-01-01T00:00:00Z');

    const khcVendors: Vendor[] = [
      {
        id: 'vendor-khc-001', companyCode: 'khc001', name: 'Air Kiribati', category: 'Airlines',
        contactEmail: 'reservations@airkiribati.com.ki', contactPhone: '+686 21 886', services: ['flights'],
        status: 'approved', proposedBy: khcUserId, proposedAt: khcNow, approvedBy: khcUserId, approvedAt: khcNow,
        rejectionReason: null, suspensionReason: null, performanceRating: 4,
        performanceReviews: [{ rating: 4, comment: 'Only direct service to Tarawa from Fiji', date: '2025-03-20' }],
        notes: 'Primary carrier for Tarawa routes', createdAt: khcNow, updatedAt: khcNow,
      },
      {
        id: 'vendor-khc-002', companyCode: 'khc001', name: 'Otintaai Hotel', category: 'Hotels',
        contactEmail: 'bookings@otintaai.com.ki', contactPhone: '+686 21 128', services: ['hotels'],
        status: 'approved', proposedBy: khcUserId, proposedAt: khcNow, approvedBy: khcUserId, approvedAt: khcNow,
        rejectionReason: null, suspensionReason: null, performanceRating: 4,
        performanceReviews: [{ rating: 4, comment: 'Best accommodation in South Tarawa', date: '2025-04-05' }],
        notes: 'Preferred Tarawa accommodation', createdAt: khcNow, updatedAt: khcNow,
      },
    ];
    khcVendors.forEach(v => this.vendors.set(v.id, v));

    const khcTemplates: EmailTemplate[] = [
      {
        id: 'template-khc-001', companyCode: 'khc001', name: 'approval_notification',
        description: 'KHC approval request notification',
        subject: 'Kiribati High Commission — Travel Approval Required: {{travelerName}} to {{destination}}',
        body: '<p>Dear {{approverName}},</p><p>A Kiribati High Commission travel request requires your approval.</p><ul><li><strong>Traveler:</strong> {{travelerName}}</li><li><strong>Destination:</strong> {{destination}}</li><li><strong>Dates:</strong> {{startDate}} to {{endDate}}</li><li><strong>Cost:</strong> FJD {{totalCost}}</li></ul><p>Regards,<br>KHC TripFlow</p>',
        placeholders: ['approverName', 'travelerName', 'destination', 'startDate', 'endDate', 'totalCost'],
        category: 'approval', isActive: true, createdBy: khcUserId, createdAt: khcNow, updatedAt: khcNow,
      },
    ];
    khcTemplates.forEach(t => this.emailTemplates.set(t.id, t));

    const khcRates: PerDiemRate[] = [
      {
        id: 'rate-khc-001', companyCode: 'khc001', location: 'Kiribati - Tarawa', locationCode: 'TRW',
        dailyRate: '320.00', currency: 'FJD', effectiveFrom: new Date('2025-01-01T00:00:00Z'), effectiveTo: null,
        notes: 'KHC per diem — Tarawa', createdBy: khcUserId, createdAt: khcNow, updatedAt: khcNow,
      },
      {
        id: 'rate-khc-002', companyCode: 'khc001', location: 'United States - New York', locationCode: 'JFK',
        dailyRate: '467.00', currency: 'FJD', effectiveFrom: new Date('2025-01-01T00:00:00Z'), effectiveTo: null,
        notes: 'KHC per diem — New York (UNGA)', createdBy: khcUserId, createdAt: khcNow, updatedAt: khcNow,
      },
    ];
    khcRates.forEach(r => this.perDiemRates.set(r.id, r));

    const khcPolicies: TravelPolicy[] = [
      {
        id: 'policy-khc-001', companyCode: 'khc001', name: 'KHC Advance Booking Policy',
        description: 'Minimum booking window for High Commission travel',
        policyType: 'advance_booking',
        rules: {
          domestic: { days: 7, description: 'Book domestic travel 7 days in advance' },
          international: { days: 21, description: 'Book international travel 21 days in advance (visa lead time)' },
        },
        isActive: true, priority: 8, createdBy: khcUserId, createdAt: khcNow, updatedAt: khcNow,
      },
    ];
    khcPolicies.forEach(p => this.travelPolicies.set(p.id, p));

    const khcWorkflows: WorkflowRule[] = [
      {
        id: 'workflow-khc-001', companyCode: 'khc001', name: 'KHC Manager Approval',
        description: 'All High Commission travel requires High Commissioner sign-off',
        conditions: {}, actions: { requireApproval: 'manager' }, stages: ['manager'],
        isActive: true, priority: 10, createdBy: khcUserId, createdAt: khcNow, updatedAt: khcNow,
      },
    ];
    khcWorkflows.forEach(w => this.workflowRules.set(w.id, w));

    const khcNotifications: SystemNotification[] = [
      {
        id: 'notif-khc-001', companyCode: 'khc001', title: 'Kiribati High Commission Travel Portal',
        message: 'Welcome to the Kiribati High Commission TripFlow portal. Submit and track official travel requests here.',
        type: 'banner', severity: 'info', isPublished: true, publishedAt: khcNow, expiresAt: null,
        targetRoles: null, createdBy: khcUserId, createdAt: khcNow, updatedAt: khcNow,
      },
    ];
    khcNotifications.forEach(n => this.systemNotifications.set(n.id, n));

    const khcAuditLogs: AuditLog[] = [
      {
        id: 'audit-khc-001', companyCode: 'khc001', userId: khcUserId, userName: 'Bwere Ieang',
        action: 'create', entityType: 'vendor', entityId: 'vendor-khc-001',
        previousValue: null, newValue: { name: 'Air Kiribati', status: 'approved' },
        changes: null, metadata: { vendorName: 'Air Kiribati' }, ipAddress: null, timestamp: khcNow,
      },
    ];
    khcAuditLogs.forEach(log => this.auditLogs.set(log.id, log));

    // ── Company Settings ────────────────────────────────────────────────────
    const ittSettings: CompanySettings = {
      id: 'settings-itt-001', companyCode: 'itt001', displayName: 'Island Travel Technologies',
      contactEmail: 'admin@islandtraveltech.com', timezone: 'Pacific/Fiji', logoUrl: null,
      createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z'),
    };
    const thcSettings: CompanySettings = {
      id: 'settings-thc-001', companyCode: 'thc001', displayName: 'Tuvalu High Commission',
      contactEmail: 'admin@tuvaluhighcomm.demo', timezone: 'Pacific/Fiji', logoUrl: null,
      createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z'),
    };
    const khcSettings: CompanySettings = {
      id: 'settings-khc-001', companyCode: 'khc001', displayName: 'Kiribati High Commission',
      contactEmail: 'admin@kiribatihighcomm.demo', timezone: 'Pacific/Fiji', logoUrl: null,
      createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z'),
    };
    this.companySettingsMap.set('itt001', ittSettings);
    this.companySettingsMap.set('thc001', thcSettings);
    this.companySettingsMap.set('khc001', khcSettings);

    // ── Cost Centres ────────────────────────────────────────────────────────
    const ittCostCentres: CostCentreRecord[] = [
      { id: 'cc-itt-001', companyCode: 'itt001', code: '100-BOD', name: 'Board of Directors', budgetLimit: '500000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-002', companyCode: 'itt001', code: '200-EXE', name: 'Executive Management', budgetLimit: '350000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-003', companyCode: 'itt001', code: '300-TRV', name: 'Travel Operations', budgetLimit: '280000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-004', companyCode: 'itt001', code: '400-VIS', name: 'Visa / Immigration Services', budgetLimit: '120000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-005', companyCode: 'itt001', code: '500-CSR', name: 'Customer Service / Reservations', budgetLimit: '200000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-006', companyCode: 'itt001', code: '600-FIN', name: 'Finance & Accounting', budgetLimit: '180000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-007', companyCode: 'itt001', code: '700-TEC', name: 'Technology & Data', budgetLimit: '220000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-008', companyCode: 'itt001', code: '800-MKT', name: 'Marketing & Sales', budgetLimit: '160000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-009', companyCode: 'itt001', code: '900-CMP', name: 'Compliance, Audit, Risk', budgetLimit: '140000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-010', companyCode: 'itt001', code: '1000-ADM', name: 'Administration & HR', budgetLimit: '170000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-itt-011', companyCode: 'itt001', code: '1100-SUB', name: 'Subsidiaries (Combined)', budgetLimit: '300000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
    ];
    const thcCostCentres: CostCentreRecord[] = [
      { id: 'cc-thc-001', companyCode: 'thc001', code: 'THC-EXEC', name: 'Executive', budgetLimit: '200000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-thc-002', companyCode: 'thc001', code: 'THC-CON', name: 'Consular', budgetLimit: '150000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-thc-003', companyCode: 'thc001', code: 'THC-POL', name: 'Political Affairs', budgetLimit: '100000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
    ];
    const khcCostCentres: CostCentreRecord[] = [
      { id: 'cc-khc-001', companyCode: 'khc001', code: 'KHC-EXEC', name: 'Executive', budgetLimit: '200000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-khc-002', companyCode: 'khc001', code: 'KHC-CON', name: 'Consular', budgetLimit: '150000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-khc-003', companyCode: 'khc001', code: 'KHC-ENV', name: 'Environment', budgetLimit: '80000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
      { id: 'cc-khc-004', companyCode: 'khc001', code: 'KHC-MLT', name: 'Multilateral', budgetLimit: '120000.00', createdAt: new Date('2025-01-01T00:00:00Z'), updatedAt: new Date('2025-01-01T00:00:00Z') },
    ];
    ittCostCentres.forEach(cc => this.costCentreRecords.set(cc.id, cc));
    thcCostCentres.forEach(cc => this.costCentreRecords.set(cc.id, cc));
    khcCostCentres.forEach(cc => this.costCentreRecords.set(cc.id, cc));  }

  // Admin Portal - User Management
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(u => structuredClone(u));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated: User = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return structuredClone(updated);
  }

  // Admin Portal - Vendors
  async getVendors(status?: string, companyCode?: string | null): Promise<Vendor[]> {
    let allVendors = Array.from(this.vendors.values());
    if (companyCode) allVendors = allVendors.filter(v => v.companyCode === companyCode);
    if (status) {
      return allVendors.filter(v => v.status === status).map(v => structuredClone(v));
    }
    return allVendors.map(v => structuredClone(v));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    return vendor ? structuredClone(vendor) : undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = `vendor-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newVendor: Vendor = {
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
    };
    this.vendors.set(id, newVendor);
    return newVendor;
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const existing = this.vendors.get(id);
    if (!existing) return undefined;

    const updated: Vendor = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.vendors.set(id, updated);
    // Return deep clone to ensure audit logging receives independent object
    return structuredClone(updated);
  }

  async deleteVendor(id: string): Promise<boolean> {
    return this.vendors.delete(id);
  }

  // Admin Portal - Email Templates
  async getEmailTemplates(category?: string, companyCode?: string | null): Promise<EmailTemplate[]> {
    let allTemplates = Array.from(this.emailTemplates.values());
    if (companyCode) allTemplates = allTemplates.filter(t => t.companyCode === companyCode);
    if (category) {
      return allTemplates.filter(t => t.category === category).map(t => structuredClone(t));
    }
    return allTemplates.map(t => structuredClone(t));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const template = this.emailTemplates.get(id);
    return template ? structuredClone(template) : undefined;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = `template-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newTemplate: EmailTemplate = {
      id,
      companyCode: template.companyCode ?? null,
      name: template.name,
      description: template.description || null,
      subject: template.subject,
      body: template.body,
      placeholders: template.placeholders || null,
      category: template.category || null,
      isActive: template.isActive ?? true,
      createdBy: template.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.emailTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const existing = this.emailTemplates.get(id);
    if (!existing) return undefined;

    const updated: EmailTemplate = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.emailTemplates.set(id, updated);
    // Return deep clone to ensure audit logging receives independent object
    return structuredClone(updated);
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    return this.emailTemplates.delete(id);
  }

  // Admin Portal - Per Diem Rates
  async getPerDiemRates(companyCode?: string | null): Promise<PerDiemRate[]> {
    let all = Array.from(this.perDiemRates.values());
    if (companyCode) all = all.filter(r => r.companyCode === companyCode);
    return all.map(r => structuredClone(r));
  }

  async getPerDiemRate(id: string): Promise<PerDiemRate | undefined> {
    const rate = this.perDiemRates.get(id);
    return rate ? structuredClone(rate) : undefined;
  }

  async getActivePerDiemRate(location: string, date: Date): Promise<PerDiemRate | undefined> {
    const rates = Array.from(this.perDiemRates.values());
    return rates.find(r => {
      const matchesLocation = r.location.toLowerCase() === location.toLowerCase() || 
                            r.locationCode?.toLowerCase() === location.toLowerCase();
      const afterEffectiveFrom = new Date(r.effectiveFrom) <= date;
      const beforeEffectiveTo = !r.effectiveTo || new Date(r.effectiveTo) >= date;
      return matchesLocation && afterEffectiveFrom && beforeEffectiveTo;
    });
  }

  async createPerDiemRate(rate: InsertPerDiemRate): Promise<PerDiemRate> {
    const id = `rate-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newRate: PerDiemRate = {
      id,
      companyCode: rate.companyCode ?? null,
      location: rate.location,
      locationCode: rate.locationCode || null,
      dailyRate: rate.dailyRate,
      currency: rate.currency || "FJD",
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo || null,
      notes: rate.notes || null,
      createdBy: rate.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.perDiemRates.set(id, newRate);
    return newRate;
  }

  async updatePerDiemRate(id: string, updates: Partial<PerDiemRate>): Promise<PerDiemRate | undefined> {
    const existing = this.perDiemRates.get(id);
    if (!existing) return undefined;

    const updated: PerDiemRate = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.perDiemRates.set(id, updated);
    // Return deep clone to ensure audit logging receives independent object
    return structuredClone(updated);
  }

  async deletePerDiemRate(id: string): Promise<boolean> {
    return this.perDiemRates.delete(id);
  }

  // Admin Portal - Travel Policies
  async getTravelPolicies(companyCode?: string | null): Promise<TravelPolicy[]> {
    let all = Array.from(this.travelPolicies.values());
    if (companyCode) all = all.filter(p => p.companyCode === companyCode);
    return all.map(p => structuredClone(p));
  }

  async getTravelPolicy(id: string): Promise<TravelPolicy | undefined> {
    const policy = this.travelPolicies.get(id);
    return policy ? structuredClone(policy) : undefined;
  }

  async createTravelPolicy(policy: InsertTravelPolicy): Promise<TravelPolicy> {
    const id = `policy-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newPolicy: TravelPolicy = {
      id,
      companyCode: policy.companyCode ?? null,
      name: policy.name,
      description: policy.description || null,
      policyType: policy.policyType,
      rules: policy.rules,
      isActive: policy.isActive ?? true,
      priority: policy.priority ?? 5,
      createdBy: policy.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.travelPolicies.set(id, newPolicy);
    return newPolicy;
  }

  async updateTravelPolicy(id: string, updates: Partial<TravelPolicy>): Promise<TravelPolicy | undefined> {
    const existing = this.travelPolicies.get(id);
    if (!existing) return undefined;

    const updated: TravelPolicy = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.travelPolicies.set(id, updated);
    // Return deep clone to ensure audit logging receives independent object
    return structuredClone(updated);
  }

  async deleteTravelPolicy(id: string): Promise<boolean> {
    return this.travelPolicies.delete(id);
  }

  // Admin Portal - Workflow Rules
  async getWorkflowRules(companyCode?: string | null): Promise<WorkflowRule[]> {
    let all = Array.from(this.workflowRules.values());
    if (companyCode) all = all.filter(w => w.companyCode === companyCode);
    return all.map(w => structuredClone(w));
  }

  async getWorkflowRule(id: string): Promise<WorkflowRule | undefined> {
    const rule = this.workflowRules.get(id);
    return rule ? structuredClone(rule) : undefined;
  }

  async createWorkflowRule(rule: InsertWorkflowRule): Promise<WorkflowRule> {
    const id = `workflow-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newRule: WorkflowRule = {
      id,
      companyCode: rule.companyCode ?? null,
      name: rule.name,
      description: rule.description || null,
      conditions: rule.conditions,
      actions: rule.actions,
      stages: rule.stages || null,
      isActive: rule.isActive ?? true,
      priority: rule.priority ?? 5,
      createdBy: rule.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.workflowRules.set(id, newRule);
    return newRule;
  }

  async updateWorkflowRule(id: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule | undefined> {
    const existing = this.workflowRules.get(id);
    if (!existing) return undefined;

    const updated: WorkflowRule = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.workflowRules.set(id, updated);
    // Return deep clone to ensure audit logging receives independent object
    return structuredClone(updated);
  }

  async deleteWorkflowRule(id: string): Promise<boolean> {
    return this.workflowRules.delete(id);
  }

  // Admin Portal - System Notifications
  async getSystemNotifications(published?: boolean, companyCode?: string | null): Promise<SystemNotification[]> {
    let allNotifications = Array.from(this.systemNotifications.values());
    if (companyCode) allNotifications = allNotifications.filter(n => n.companyCode === companyCode);
    if (published !== undefined) {
      return allNotifications.filter(n => n.isPublished === published).map(n => structuredClone(n));
    }
    return allNotifications.map(n => structuredClone(n));
  }

  async getSystemNotification(id: string): Promise<SystemNotification | undefined> {
    const notification = this.systemNotifications.get(id);
    return notification ? structuredClone(notification) : undefined;
  }

  async createSystemNotification(notification: InsertSystemNotification): Promise<SystemNotification> {
    const id = `notif-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const newNotification: SystemNotification = {
      id,
      companyCode: notification.companyCode ?? null,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      severity: notification.severity ?? "info",
      isPublished: notification.isPublished ?? false,
      publishedAt: notification.publishedAt || null,
      expiresAt: notification.expiresAt || null,
      targetRoles: notification.targetRoles || null,
      createdBy: notification.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.systemNotifications.set(id, newNotification);
    return newNotification;
  }

  async updateSystemNotification(id: string, updates: Partial<SystemNotification>): Promise<SystemNotification | undefined> {
    const existing = this.systemNotifications.get(id);
    if (!existing) return undefined;

    const updated: SystemNotification = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.systemNotifications.set(id, updated);
    // Return deep clone to ensure audit logging receives independent object
    return structuredClone(updated);
  }

  async deleteSystemNotification(id: string): Promise<boolean> {
    return this.systemNotifications.delete(id);
  }

  // Admin Portal - Audit Logs
  async getAuditLogs(companyCode?: string, entityType?: string, entityId?: string): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());

    if (companyCode) {
      logs = logs.filter(l => l.companyCode === companyCode);
    }
    
    if (entityType) {
      logs = logs.filter(l => l.entityType === entityType);
    }
    
    if (entityId) {
      logs = logs.filter(l => l.entityId === entityId);
    }
    
    // Sort by timestamp descending (most recent first) and clone each entry
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(l => structuredClone(l));
  }

  async getAuditLog(id: string): Promise<AuditLog | undefined> {
    const log = this.auditLogs.get(id);
    return log ? structuredClone(log) : undefined;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = `audit-${randomUUID().slice(0, 8)}`;
    const newLog: AuditLog = {
      id,
      companyCode: log.companyCode || null,
      userId: log.userId,
      userName: log.userName || null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      previousValue: log.previousValue ?? null,
      newValue: log.newValue ?? null,
      changes: log.changes || null,
      metadata: log.metadata || null,
      ipAddress: log.ipAddress || null,
      timestamp: new Date(),
    };
    this.auditLogs.set(id, newLog);
    return newLog;
  }

  // Expense Claims
  async getExpenseClaims(requestId?: string): Promise<ExpenseClaim[]> {
    let claims = Array.from(this.expenseClaims.values());
    if (requestId) {
      claims = claims.filter(c => c.requestId === requestId);
    }
    return claims
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(c => structuredClone(c));
  }

  async getExpenseClaim(id: string): Promise<ExpenseClaim | undefined> {
    const claim = this.expenseClaims.get(id);
    return claim ? structuredClone(claim) : undefined;
  }

  async createExpenseClaim(claim: Omit<ExpenseClaim, "id" | "createdAt" | "updatedAt">): Promise<ExpenseClaim> {
    const id = `claim-${randomUUID().slice(0, 8)}`;
    const tclNumber = this.generateTCLNumber();
    const now = new Date().toISOString();
    const newClaim: ExpenseClaim = {
      ...claim,
      id,
      tclNumber,
      createdAt: now,
      updatedAt: now,
    };
    this.expenseClaims.set(id, newClaim);
    return structuredClone(newClaim);
  }

  async updateExpenseClaim(id: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | undefined> {
    const existing = this.expenseClaims.get(id);
    if (!existing) return undefined;
    const updated: ExpenseClaim = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.expenseClaims.set(id, updated);
    return structuredClone(updated);
  }

  async deleteExpenseClaim(id: string): Promise<boolean> {
    return this.expenseClaims.delete(id);
  }

  // Admin Portal - Company Settings
  async getCompanySettings(companyCode: string): Promise<CompanySettings | undefined> {
    const settings = this.companySettingsMap.get(companyCode);
    return settings ? structuredClone(settings) : undefined;
  }

  async upsertCompanySettings(data: InsertCompanySettings): Promise<CompanySettings> {
    const existing = this.companySettingsMap.get(data.companyCode);
    const now = new Date();
    const record: CompanySettings = {
      id: existing?.id ?? `settings-${randomUUID().slice(0, 8)}`,
      companyCode: data.companyCode,
      displayName: data.displayName,
      contactEmail: data.contactEmail ?? null,
      timezone: data.timezone ?? "Pacific/Fiji",
      logoUrl: data.logoUrl ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.companySettingsMap.set(data.companyCode, record);
    return structuredClone(record);
  }

  // Admin Portal - Cost Centre Records
  async getCostCentreRecords(companyCode: string): Promise<CostCentreRecord[]> {
    return Array.from(this.costCentreRecords.values())
      .filter(cc => cc.companyCode === companyCode)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(cc => structuredClone(cc));
  }

  async getCostCentreRecord(id: string): Promise<CostCentreRecord | undefined> {
    const cc = this.costCentreRecords.get(id);
    return cc ? structuredClone(cc) : undefined;
  }

  async createCostCentreRecord(data: InsertCostCentreRecord): Promise<CostCentreRecord> {
    const id = `cc-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const record: CostCentreRecord = {
      id,
      companyCode: data.companyCode,
      code: data.code,
      name: data.name,
      budgetLimit: data.budgetLimit ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.costCentreRecords.set(id, record);
    return structuredClone(record);
  }

  async updateCostCentreRecord(id: string, updates: Partial<CostCentreRecord>): Promise<CostCentreRecord | undefined> {
    const existing = this.costCentreRecords.get(id);
    if (!existing) return undefined;
    const updated: CostCentreRecord = {
      ...existing,
      ...updates,
      id,
      companyCode: existing.companyCode, // immutable
      updatedAt: new Date(),
    };
    this.costCentreRecords.set(id, updated);
    return structuredClone(updated);
  }

  async deleteCostCentreRecord(id: string): Promise<boolean> {
    return this.costCentreRecords.delete(id);
  }
}

export const storage = new DbStorage(db);
