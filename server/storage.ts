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
    
    // Seed with sample data
    this.seedSampleData();
    this.seedQuotePolicy();
  }

  private seedSampleData() {
    // Island Travel Technologies Demo User
    // DEMO CREDENTIALS (for demo environment only):
    //   Company Code: itt001
    //   Email: desmond.bale@islandtraveltech.com
    //   Password: itt1235* (stored as bcrypt hash below)
    //   Role: super_admin (full admin portal access)
    
    // All demo users share password: itt1235*
    // bcrypt hash of "itt1235*" generated with bcrypt.hash("itt1235*", 10)
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
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    // ── CDP Couriers Demo Users ──────────────────────────────────────────────
    // Company: CDP Couriers | Code: cdp001 | Password: Demo@12345
    // bcrypt hash of "Demo@12345" generated with bcrypt.hash("Demo@12345", 10)
    const CDP_DEMO_HASH = "$2b$10$DOF5lGyFep2rEma0gSVYn./NHcD2TFRKE8Av.d/aY1ZinHcu5UNUe";

    const cdpUsers: User[] = [
      {
        id: "user-cdp-md-001",
        email: "sashi.singh@cdpcouriers.demo",
        firstName: "Sashi",
        lastName: "Singh",
        profileImageUrl: null,
        role: "super_admin",
        companyCode: "cdp001",
        passwordHash: CDP_DEMO_HASH,
        createdAt: new Date("2025-06-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T00:00:00Z"),
      },
      {
        id: "user-cdp-ceo-001",
        email: "rajnil.singh@cdpcouriers.demo",
        firstName: "Rajnil",
        lastName: "Singh",
        profileImageUrl: null,
        role: "super_admin",
        companyCode: "cdp001",
        passwordHash: CDP_DEMO_HASH,
        createdAt: new Date("2025-06-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T00:00:00Z"),
      },
      {
        id: "user-cdp-gm-001",
        email: "george.singh@cdpcouriers.demo",
        firstName: "George",
        lastName: "Singh",
        profileImageUrl: null,
        role: "manager",
        companyCode: "cdp001",
        passwordHash: CDP_DEMO_HASH,
        createdAt: new Date("2025-06-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T00:00:00Z"),
      },
      {
        id: "user-cdp-fin-001",
        email: "ashwin.ram@cdpcouriers.demo",
        firstName: "Ashwin",
        lastName: "Ram",
        profileImageUrl: null,
        role: "finance_admin",
        companyCode: "cdp001",
        passwordHash: CDP_DEMO_HASH,
        createdAt: new Date("2025-06-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T00:00:00Z"),
      },
      {
        id: "user-cdp-arr-001",
        email: "rajneelta@cdpcouriers.demo",
        firstName: "Rajneelta",
        lastName: null,
        profileImageUrl: null,
        role: "coordinator",
        companyCode: "cdp001",
        passwordHash: CDP_DEMO_HASH,
        createdAt: new Date("2025-06-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T00:00:00Z"),
      },
    ];

    // Store all users (ITT + CDP)
    testUsers.forEach(user => this.users.set(user.id, user));
    cdpUsers.forEach(user => this.users.set(user.id, user));

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

    // ── CDP Couriers - Demo Travel Requests ──────────────────────────────────
    // 10 domestic Fiji trips for CDP Couriers (cdp001)
    // Arranged by Rajneelta | Approver chain: manager → finance_admin → super_admin
    const cdpRequests: TravelRequest[] = [
      {
        // #1 — George Singh: Suva → Nadi (Land) | FJD 145 | Pending Approval
        id: "cdp-req-001",
        ttrNumber: "CDP-2026-00001",
        companyCode: "cdp001",
        employeeName: "Mr. George Singh",
        employeeNumber: "CDP-OPS-001",
        position: "General Manager Operations",
        department: "Operations",
        employeeId: "user-cdp-gm-001",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        preferredRoute: "Suva → Nadi",
        travelMode: "Land",
        suggestedModes: ["Air", "Land"],
        startDate: "2026-04-08",
        endDate: "2026-04-09",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Operations meeting with Western Division team",
        perDiem: { totalFJD: 80, days: 2, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 0, lastDayFJD: 30 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "submitted",
        submittedAt: "2026-03-28T08:30:00Z",
        costCentre: { code: "CDP-OPS", name: "Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 0,
        history: [
          { ts: "2026-03-28T08:30:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — Operations meeting Western Division" },
        ],
        needsFlights: false,
        needsAccommodation: false,
        needsVisa: false,
        needsTransport: true,
        totalEstimatedBudget: 145,
        costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 145, perDiem: 80, totalCost: 145 },
      },
      {
        // #2 — Ashwin Ram: Suva → Labasa (Air) | FJD 420 | Approved
        id: "cdp-req-002",
        ttrNumber: "CDP-2026-00002",
        companyCode: "cdp001",
        employeeName: "Mr. Ashwin Ram",
        employeeNumber: "CDP-FIN-001",
        position: "Manager Finance",
        department: "Finance",
        employeeId: "user-cdp-fin-001",
        destination: { code: "LBS", city: "Labasa", country: "Fiji" },
        preferredRoute: "Suva → Labasa",
        travelMode: "Air",
        suggestedModes: ["Air", "Sea"],
        startDate: "2026-02-12",
        endDate: "2026-02-14",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Finance review and branch visit",
        perDiem: { totalFJD: 120, days: 3, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 40, lastDayFJD: 30 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "approved",
        submittedAt: "2026-02-03T09:15:00Z",
        costCentre: { code: "CDP-FIN", name: "Finance" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 3,
        history: [
          { ts: "2026-02-03T09:15:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — Finance review Labasa branch" },
          { ts: "2026-02-04T10:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved — routine finance visit" },
          { ts: "2026-02-04T14:30:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance approved" },
          { ts: "2026-02-05T08:00:00Z", actor: "user-cdp-ceo-001", action: "APPROVE", note: "Executive approval granted" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        totalEstimatedBudget: 420,
        costBreakdown: { flights: 220, accommodation: 80, groundTransfers: 0, perDiem: 120, totalCost: 420 },
      },
      {
        // #3 — Sashi Singh: Suva → Nadi (Air) | FJD 390 | Booked (ticketed)
        id: "cdp-req-003",
        ttrNumber: "CDP-2026-00003",
        companyCode: "cdp001",
        employeeName: "Mr. Sashi Singh",
        employeeNumber: "CDP-MD-001",
        position: "Managing Director",
        department: "Executive",
        employeeId: "user-cdp-md-001",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        preferredRoute: "Suva → Nadi",
        travelMode: "Air",
        suggestedModes: ["Air", "Land"],
        startDate: "2026-04-15",
        endDate: "2026-04-17",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Executive meeting with strategic partners",
        perDiem: { totalFJD: 120, days: 3, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 40, lastDayFJD: 30 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "ticketed",
        submittedAt: "2026-03-20T10:00:00Z",
        costCentre: { code: "CDP-EXEC", name: "Executive" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 3,
        history: [
          { ts: "2026-03-20T10:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — MD strategic partner meeting" },
          { ts: "2026-03-21T09:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved" },
          { ts: "2026-03-21T11:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Budget cleared" },
          { ts: "2026-03-21T14:00:00Z", actor: "user-cdp-ceo-001", action: "APPROVE", note: "Approved by CEO" },
          { ts: "2026-03-22T09:00:00Z", actor: "user-cdp-arr-001", action: "TICKET", note: "Flight booked — Fiji Airways FJ103" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
        totalEstimatedBudget: 390,
        costBreakdown: { flights: 180, accommodation: 90, groundTransfers: 0, perDiem: 120, totalCost: 390 },
      },
      {
        // #4 — Rajnil Singh: Suva → Savusavu (Air) | FJD 510 | Pending Approval
        id: "cdp-req-004",
        ttrNumber: "CDP-2026-00004",
        companyCode: "cdp001",
        employeeName: "Mr. Rajnil Singh",
        employeeNumber: "CDP-CEO-001",
        position: "Chief Executive Officer",
        department: "Executive",
        employeeId: "user-cdp-ceo-001",
        destination: { code: "SVU", city: "Savusavu", country: "Fiji" },
        preferredRoute: "Suva → Savusavu",
        travelMode: "Air",
        suggestedModes: ["Air", "Sea"],
        startDate: "2026-04-22",
        endDate: "2026-04-24",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Client relationship visit",
        perDiem: { totalFJD: 150, days: 3, mieFJD: 50, firstDayFJD: 37.5, middleDaysFJD: 50, lastDayFJD: 37.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "submitted",
        submittedAt: "2026-04-01T11:00:00Z",
        costCentre: { code: "CDP-EXEC", name: "Executive" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 0,
        history: [
          { ts: "2026-04-01T11:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — CEO client relationship visit" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: false,
        totalEstimatedBudget: 510,
        costBreakdown: { flights: 280, accommodation: 80, groundTransfers: 0, perDiem: 150, totalCost: 510 },
      },
      {
        // #5 — George Singh: Nadi → Lautoka (Land) | FJD 55 | Completed (approved + past)
        id: "cdp-req-005",
        ttrNumber: "CDP-2026-00005",
        companyCode: "cdp001",
        employeeName: "Mr. George Singh",
        employeeNumber: "CDP-OPS-001",
        position: "General Manager Operations",
        department: "Operations",
        employeeId: "user-cdp-gm-001",
        destination: { code: "LTK", city: "Lautoka", country: "Fiji" },
        preferredRoute: "Nadi → Lautoka",
        travelMode: "Land",
        suggestedModes: ["Land"],
        startDate: "2026-01-20",
        endDate: "2026-01-20",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Site operations visit",
        perDiem: { totalFJD: 40, days: 1, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 0, lastDayFJD: 30 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "approved",
        submittedAt: "2026-01-15T08:00:00Z",
        costCentre: { code: "CDP-OPS", name: "Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 2,
        history: [
          { ts: "2026-01-15T08:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — site operations Lautoka" },
          { ts: "2026-01-15T13:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved — day trip" },
          { ts: "2026-01-15T15:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance approved" },
        ],
        needsFlights: false,
        needsAccommodation: false,
        needsVisa: false,
        needsTransport: true,
        totalEstimatedBudget: 55,
        costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 55, perDiem: 40, totalCost: 55 },
      },
      {
        // #6 — Ashwin Ram: Suva → Nausori (Land) | FJD 35 | Completed (approved + past)
        id: "cdp-req-006",
        ttrNumber: "CDP-2026-00006",
        companyCode: "cdp001",
        employeeName: "Mr. Ashwin Ram",
        employeeNumber: "CDP-FIN-001",
        position: "Manager Finance",
        department: "Finance",
        employeeId: "user-cdp-fin-001",
        destination: { code: "NAU", city: "Nausori", country: "Fiji" },
        preferredRoute: "Suva → Nausori",
        travelMode: "Land",
        suggestedModes: ["Land"],
        startDate: "2026-01-28",
        endDate: "2026-01-28",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Bank and finance meetings",
        perDiem: { totalFJD: 30, days: 1, mieFJD: 30, firstDayFJD: 22.5, middleDaysFJD: 0, lastDayFJD: 22.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "approved",
        submittedAt: "2026-01-24T09:00:00Z",
        costCentre: { code: "CDP-FIN", name: "Finance" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 2,
        history: [
          { ts: "2026-01-24T09:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — bank meetings Nausori" },
          { ts: "2026-01-24T11:30:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved" },
          { ts: "2026-01-24T14:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance approved" },
        ],
        needsFlights: false,
        needsAccommodation: false,
        needsVisa: false,
        needsTransport: true,
        totalEstimatedBudget: 35,
        costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 35, perDiem: 30, totalCost: 35 },
      },
      {
        // #7 — George Singh: Suva → Labasa (Sea) | FJD 220 | Rejected
        id: "cdp-req-007",
        ttrNumber: "CDP-2026-00007",
        companyCode: "cdp001",
        employeeName: "Mr. George Singh",
        employeeNumber: "CDP-OPS-001",
        position: "General Manager Operations",
        department: "Operations",
        employeeId: "user-cdp-gm-001",
        destination: { code: "LBS", city: "Labasa", country: "Fiji" },
        preferredRoute: "Suva → Labasa",
        travelMode: "Sea",
        suggestedModes: ["Air", "Sea"],
        startDate: "2026-03-05",
        endDate: "2026-03-07",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Cargo coordination and branch support",
        perDiem: { totalFJD: 90, days: 3, mieFJD: 30, firstDayFJD: 22.5, middleDaysFJD: 30, lastDayFJD: 22.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "rejected",
        submittedAt: "2026-02-20T10:00:00Z",
        reviewedAt: "2026-02-21T09:30:00Z",
        reviewedBy: "user-cdp-gm-001",
        reviewComment: "Timing not suitable for operational urgency — reschedule for next quarter.",
        costCentre: { code: "CDP-OPS", name: "Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 0,
        history: [
          { ts: "2026-02-20T10:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — cargo coordination Labasa" },
          { ts: "2026-02-21T09:30:00Z", actor: "user-cdp-gm-001", action: "REJECT", note: "Timing not suitable for operational urgency — reschedule for next quarter" },
        ],
        needsFlights: false,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: false,
        totalEstimatedBudget: 220,
        costBreakdown: { flights: 0, accommodation: 130, groundTransfers: 0, perDiem: 90, totalCost: 220 },
      },
      {
        // #8 — Rajnil Singh: Suva → Taveuni (Air) | FJD 560 | Approved (currently travelling)
        id: "cdp-req-008",
        ttrNumber: "CDP-2026-00008",
        companyCode: "cdp001",
        employeeName: "Mr. Rajnil Singh",
        employeeNumber: "CDP-CEO-001",
        position: "Chief Executive Officer",
        department: "Executive",
        employeeId: "user-cdp-ceo-001",
        destination: { code: "TVU", city: "Taveuni", country: "Fiji" },
        preferredRoute: "Suva → Taveuni",
        travelMode: "Air",
        suggestedModes: ["Air", "Sea"],
        startDate: "2026-03-28",
        endDate: "2026-04-02",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Regional client discussion",
        perDiem: { totalFJD: 150, days: 3, mieFJD: 50, firstDayFJD: 37.5, middleDaysFJD: 50, lastDayFJD: 37.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "approved",
        submittedAt: "2026-02-25T09:00:00Z",
        costCentre: { code: "CDP-EXEC", name: "Executive" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 3,
        history: [
          { ts: "2026-02-25T09:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — CEO regional client visit Taveuni" },
          { ts: "2026-02-26T08:30:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved" },
          { ts: "2026-02-26T11:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance cleared" },
          { ts: "2026-02-26T14:30:00Z", actor: "user-cdp-md-001", action: "APPROVE", note: "MD approval — executive travel" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: false,
        totalEstimatedBudget: 560,
        costBreakdown: { flights: 320, accommodation: 90, groundTransfers: 0, perDiem: 150, totalCost: 560 },
      },
      {
        // #9 — Ashwin Ram: Suva → Nadi (Land) | FJD 150 | Draft
        id: "cdp-req-009",
        ttrNumber: "CDP-2026-00009",
        companyCode: "cdp001",
        employeeName: "Mr. Ashwin Ram",
        employeeNumber: "CDP-FIN-001",
        position: "Manager Finance",
        department: "Finance",
        employeeId: "user-cdp-fin-001",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        preferredRoute: "Suva → Nadi",
        travelMode: "Land",
        suggestedModes: ["Air", "Land"],
        startDate: "2026-05-06",
        endDate: "2026-05-07",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Finance compliance meeting",
        perDiem: { totalFJD: 80, days: 2, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 0, lastDayFJD: 30 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "draft",
        submittedAt: "2026-04-02T14:00:00Z",
        costCentre: { code: "CDP-FIN", name: "Finance" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 0,
        history: [
          { ts: "2026-04-02T14:00:00Z", actor: "user-cdp-arr-001", action: "COMMENT", note: "Draft created by Rajneelta — pending review before submission" },
        ],
        needsFlights: false,
        needsAccommodation: false,
        needsVisa: false,
        needsTransport: true,
        totalEstimatedBudget: 150,
        costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 150, perDiem: 80, totalCost: 150 },
      },
      {
        // #10 — George Singh: Suva → Nadi (Air) | FJD 405 | In Review
        id: "cdp-req-010",
        ttrNumber: "CDP-2026-00010",
        companyCode: "cdp001",
        employeeName: "Mr. George Singh",
        employeeNumber: "CDP-OPS-001",
        position: "General Manager Operations",
        department: "Operations",
        employeeId: "user-cdp-gm-001",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        preferredRoute: "Suva → Nadi",
        travelMode: "Air",
        suggestedModes: ["Air", "Land"],
        startDate: "2026-04-28",
        endDate: "2026-04-30",
        emergencyContactName: "CDP Couriers HQ",
        emergencyContactPhone: "+679 000 0000",
        countryRiskLevel: "low",
        purpose: "Urgent management review",
        perDiem: { totalFJD: 120, days: 3, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 40, lastDayFJD: 30 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
        status: "in_review",
        submittedAt: "2026-04-03T08:00:00Z",
        costCentre: { code: "CDP-OPS", name: "Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin", "super_admin"],
        approverIndex: 1,
        history: [
          { ts: "2026-04-03T08:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — urgent management review" },
          { ts: "2026-04-03T11:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "GM approved — escalated to Finance" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: false,
        totalEstimatedBudget: 405,
        costBreakdown: { flights: 180, accommodation: 105, groundTransfers: 0, perDiem: 120, totalCost: 405 },
      },
    ];

    cdpRequests.forEach(req => this.travelRequests.set(req.id, req));

    // ─── Seed expense claims — CDP Couriers only ───────────────────────────
    const cdpClaims: ExpenseClaim[] = [
      {
        // Ashwin Ram — Labasa finance review (cdp-req-002, approved trip) → paid
        id: "claim-cdp-001",
        tclNumber: "TCL-CDP-00001",
        requestId: "cdp-req-002",
        travelRequestRef: "CDP-2026-00002",
        employeeId: "user-cdp-fin-001",
        employeeName: "Mr. Ashwin Ram",
        lineItems: [
          { id: "li-c001-1", description: "Fiji Airways – Suva to Labasa return", category: "Flights", amount: 220, merchantName: "Fiji Airways", receiptDate: "2026-02-12" },
          { id: "li-c001-2", description: "Labasa accommodation – 2 nights Grand Eastern", category: "Accommodation", amount: 160, merchantName: "Grand Eastern Hotel Labasa", receiptDate: "2026-02-13" },
          { id: "li-c001-3", description: "Working meals – branch team", category: "Meals", amount: 85, merchantName: "Various Labasa", receiptDate: "2026-02-13" },
          { id: "li-c001-4", description: "Taxi – airport to town return", category: "Transport (Local)", amount: 40, merchantName: "Labasa Taxis", receiptDate: "2026-02-12" },
        ],
        totalAmount: 505,
        currency: "FJD",
        status: "paid",
        submittedAt: "2026-02-18T09:00:00Z",
        reviewedAt: "2026-02-20T10:30:00Z",
        reviewedBy: "Sashi Singh",
        reviewNotes: "All receipts verified. Payment processed.",
        createdAt: "2026-02-17T08:00:00Z",
        updatedAt: "2026-02-20T10:30:00Z",
        reconciliation: { advanceAmount: 420, varianceAmount: 85 },
      },
      {
        // George Singh — Lautoka site visit (cdp-req-005, approved day trip) → paid
        id: "claim-cdp-002",
        tclNumber: "TCL-CDP-00002",
        requestId: "cdp-req-005",
        travelRequestRef: "CDP-2026-00005",
        employeeId: "user-cdp-gm-001",
        employeeName: "Mr. George Singh",
        lineItems: [
          { id: "li-c002-1", description: "Vehicle hire – Nadi to Lautoka", category: "Transport (Local)", amount: 55, merchantName: "Pacific Car Rental", receiptDate: "2026-01-20" },
          { id: "li-c002-2", description: "Working lunch – site supervisor", category: "Meals", amount: 42, merchantName: "Lautoka Catering", receiptDate: "2026-01-20" },
        ],
        totalAmount: 97,
        currency: "FJD",
        status: "paid",
        submittedAt: "2026-01-22T08:30:00Z",
        reviewedAt: "2026-01-23T11:00:00Z",
        reviewedBy: "Ashwin Ram",
        reviewNotes: "Day trip expenses verified. Approved.",
        createdAt: "2026-01-21T16:00:00Z",
        updatedAt: "2026-01-23T11:00:00Z",
        reconciliation: { advanceAmount: 55, varianceAmount: 42 },
      },
      {
        // Ashwin Ram — Nausori bank visit (cdp-req-006, approved day trip) → approved
        id: "claim-cdp-003",
        tclNumber: "TCL-CDP-00003",
        requestId: "cdp-req-006",
        travelRequestRef: "CDP-2026-00006",
        employeeId: "user-cdp-fin-001",
        employeeName: "Mr. Ashwin Ram",
        lineItems: [
          { id: "li-c003-1", description: "Taxi Suva CBD to Nausori return", category: "Transport (Local)", amount: 35, merchantName: "Express Cabs Fiji", receiptDate: "2026-01-28" },
          { id: "li-c003-2", description: "Working lunch – bank representatives", category: "Meals", amount: 58, merchantName: "Bay of Bengal Nausori", receiptDate: "2026-01-28" },
        ],
        totalAmount: 93,
        currency: "FJD",
        status: "approved",
        submittedAt: "2026-01-30T09:00:00Z",
        reviewedAt: "2026-01-31T14:00:00Z",
        reviewedBy: "Sashi Singh",
        reviewNotes: "Approved. Awaiting next payment run.",
        createdAt: "2026-01-29T17:00:00Z",
        updatedAt: "2026-01-31T14:00:00Z",
      },
      {
        // Rajnil Singh — Taveuni client visit (cdp-req-008, approved) → under_review
        id: "claim-cdp-004",
        tclNumber: "TCL-CDP-00004",
        requestId: "cdp-req-008",
        travelRequestRef: "CDP-2026-00008",
        employeeId: "user-cdp-ceo-001",
        employeeName: "Mr. Rajnil Singh",
        lineItems: [
          { id: "li-c004-1", description: "Fiji Airways – Suva to Taveuni return", category: "Flights", amount: 320, merchantName: "Fiji Airways", receiptDate: "2026-03-10" },
          { id: "li-c004-2", description: "Taveuni Estate – 2 nights accommodation", category: "Accommodation", amount: 180, merchantName: "Taveuni Estate Resort", receiptDate: "2026-03-11" },
          { id: "li-c004-3", description: "Client dinner – Taveuni", category: "Meals", amount: 135, merchantName: "Coconut Grove Restaurant", receiptDate: "2026-03-11" },
          { id: "li-c004-4", description: "4WD hire – airport to resort", category: "Transport (Local)", amount: 80, merchantName: "Taveuni 4WD Hire", receiptDate: "2026-03-10" },
        ],
        totalAmount: 715,
        currency: "FJD",
        status: "under_review",
        submittedAt: "2026-03-15T10:00:00Z",
        createdAt: "2026-03-14T16:30:00Z",
        updatedAt: "2026-03-15T10:00:00Z",
      },
      {
        // Sashi Singh — Nadi strategic meeting (cdp-req-003, ticketed) → submitted
        id: "claim-cdp-005",
        tclNumber: "TCL-CDP-00005",
        requestId: "cdp-req-003",
        travelRequestRef: "CDP-2026-00003",
        employeeId: "user-cdp-md-001",
        employeeName: "Mr. Sashi Singh",
        lineItems: [
          { id: "li-c005-1", description: "Fiji Airways – Suva to Nadi return", category: "Flights", amount: 180, merchantName: "Fiji Airways", receiptDate: "2026-04-15" },
          { id: "li-c005-2", description: "Sheraton Fiji – 2 nights", category: "Accommodation", amount: 360, merchantName: "Sheraton Fiji Golf & Beach Resort", receiptDate: "2026-04-16" },
          { id: "li-c005-3", description: "Business dinner – strategic partners", category: "Meals", amount: 220, merchantName: "Nadi Bay Resort Restaurant", receiptDate: "2026-04-16" },
          { id: "li-c005-4", description: "Working breakfast meeting", category: "Meals", amount: 65, merchantName: "Sheraton Fiji Café", receiptDate: "2026-04-17" },
          { id: "li-c005-5", description: "Airport transfers Nadi", category: "Transport (Local)", amount: 60, merchantName: "Pacific Transfers", receiptDate: "2026-04-17" },
        ],
        totalAmount: 885,
        currency: "FJD",
        status: "submitted",
        submittedAt: "2026-04-20T09:30:00Z",
        createdAt: "2026-04-19T15:00:00Z",
        updatedAt: "2026-04-20T09:30:00Z",
      },
    ];

    cdpClaims.forEach(claim => this.expenseClaims.set(claim.id, claim));
    // Resume TCL counter from the last seeded number
    this.tclCounter = cdpClaims.length;
  }

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

    // ── CDP Couriers seed records — all scoped to cdp001 ──────────────────
    const cdpUserId = "user-cdp-md-001"; // Sashi Singh (super_admin MD)
    const cdpNow = new Date("2025-03-01T00:00:00Z");

    // CDP Vendors
    const cdpVendors: Vendor[] = [
      {
        id: "vendor-cdp-001",
        companyCode: "cdp001",
        name: "Pacific Air Cargo",
        category: "Airlines",
        contactEmail: "cargo@pacificair.com.fj",
        contactPhone: "+679-672-1234",
        services: ["flights"],
        status: "approved",
        proposedBy: cdpUserId,
        proposedAt: cdpNow,
        approvedBy: cdpUserId,
        approvedAt: cdpNow,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: 4,
        notes: "Preferred carrier for courier staff travel",
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "vendor-cdp-002",
        companyCode: "cdp001",
        name: "Suva City Hotels",
        category: "Hotels",
        contactEmail: "bookings@suvacityhotels.com.fj",
        contactPhone: "+679-330-5555",
        services: ["hotels"],
        status: "approved",
        proposedBy: cdpUserId,
        proposedAt: cdpNow,
        approvedBy: cdpUserId,
        approvedAt: cdpNow,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: 4,
        notes: "Corporate rate negotiated for CDP staff",
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "vendor-cdp-003",
        companyCode: "cdp001",
        name: "Speedy Rentals Fiji",
        category: "Car Rental",
        contactEmail: "fleet@speedyrentals.com.fj",
        contactPhone: "+679-338-9900",
        services: ["car_rental"],
        status: "pending_approval",
        proposedBy: cdpUserId,
        proposedAt: cdpNow,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        suspensionReason: null,
        performanceRating: null,
        notes: "Under review for fleet contract",
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
    ];
    cdpVendors.forEach(v => this.vendors.set(v.id, v));

    // CDP Email Templates
    const cdpTemplates: EmailTemplate[] = [
      {
        id: "template-cdp-001",
        companyCode: "cdp001",
        name: "approval_notification",
        description: "CDP approval request notification",
        subject: "CDP Couriers — Travel Approval Required: {{travelerName}} to {{destination}}",
        body: `<p>Dear {{approverName}},</p><p>A CDP Couriers travel request requires your approval.</p><ul><li><strong>Traveler:</strong> {{travelerName}}</li><li><strong>Destination:</strong> {{destination}}</li><li><strong>Dates:</strong> {{startDate}} to {{endDate}}</li><li><strong>Cost:</strong> FJD {{totalCost}}</li></ul><p>Regards,<br>CDP TripFlow</p>`,
        placeholders: ["approverName", "travelerName", "destination", "startDate", "endDate", "totalCost"],
        category: "approval",
        isActive: true,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "template-cdp-002",
        companyCode: "cdp001",
        name: "booking_confirmation",
        description: "CDP booking confirmation",
        subject: "CDP Couriers — Booking Confirmed: {{destination}}",
        body: `<p>Dear {{travelerName}},</p><p>Your travel booking is confirmed. Details: {{destination}}, {{startDate}} to {{endDate}}, Flight: {{flightDetails}}.</p><p>Safe travels,<br>CDP Admin</p>`,
        placeholders: ["travelerName", "destination", "startDate", "endDate", "flightDetails"],
        category: "booking",
        isActive: true,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
    ];
    cdpTemplates.forEach(t => this.emailTemplates.set(t.id, t));

    // CDP Per Diem Rates
    const cdpRates: PerDiemRate[] = [
      {
        id: "rate-cdp-001",
        companyCode: "cdp001",
        location: "Fiji - Suva",
        locationCode: "SUV",
        dailyRate: "300.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "CDP domestic per diem — capital",
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "rate-cdp-002",
        companyCode: "cdp001",
        location: "Fiji - Nadi",
        locationCode: "NAN",
        dailyRate: "300.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "CDP domestic per diem — west",
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "rate-cdp-003",
        companyCode: "cdp001",
        location: "Australia - Brisbane",
        locationCode: "BNE",
        dailyRate: "460.00",
        currency: "FJD",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
        notes: "CDP international per diem",
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
    ];
    cdpRates.forEach(r => this.perDiemRates.set(r.id, r));

    // CDP Travel Policies
    const cdpPolicies: TravelPolicy[] = [
      {
        id: "policy-cdp-001",
        companyCode: "cdp001",
        name: "CDP Advance Booking Policy",
        description: "Minimum booking window for CDP Couriers travel",
        policyType: "advance_booking",
        rules: {
          domestic: { days: 5, description: "Book domestic travel 5 days in advance" },
          international: { days: 10, description: "Book international travel 10 days in advance" },
        },
        isActive: true,
        priority: 8,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "policy-cdp-002",
        companyCode: "cdp001",
        name: "CDP Cost Approval Threshold",
        description: "Finance review triggers for CDP travel spend",
        policyType: "cost_threshold",
        rules: {
          thresholds: [
            { amount: 2000, currency: "FJD", approvers: ["manager"] },
            { amount: 4000, currency: "FJD", approvers: ["manager", "finance_admin"] },
          ],
        },
        isActive: true,
        priority: 9,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
    ];
    cdpPolicies.forEach(p => this.travelPolicies.set(p.id, p));

    // CDP Workflow Rules
    const cdpWorkflows: WorkflowRule[] = [
      {
        id: "workflow-cdp-001",
        companyCode: "cdp001",
        name: "CDP High-Value Approval",
        description: "Finance sign-off on trips over FJD 4,000",
        conditions: { costGreaterThan: 4000, currency: "FJD" },
        actions: { addApprover: "finance_admin", requireQuotes: 2 },
        stages: ["manager", "finance_admin"],
        isActive: true,
        priority: 9,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
      {
        id: "workflow-cdp-002",
        companyCode: "cdp001",
        name: "CDP International Travel",
        description: "Multi-stage approval for overseas CDP trips",
        conditions: { isInternational: true },
        actions: { requireVisaCheck: true, requireQuotes: 2 },
        stages: ["manager", "finance_admin"],
        isActive: true,
        priority: 7,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
    ];
    cdpWorkflows.forEach(w => this.workflowRules.set(w.id, w));

    // CDP System Notifications
    const cdpNotifications: SystemNotification[] = [
      {
        id: "notif-cdp-001",
        companyCode: "cdp001",
        title: "CDP Travel Portal Launch",
        message: "Welcome to the CDP Couriers Travel Management Portal. Submit travel requests and expense claims here.",
        type: "banner",
        severity: "info",
        isPublished: true,
        publishedAt: cdpNow,
        expiresAt: null,
        targetRoles: null,
        createdBy: cdpUserId,
        createdAt: cdpNow,
        updatedAt: cdpNow,
      },
    ];
    cdpNotifications.forEach(n => this.systemNotifications.set(n.id, n));

    // CDP Audit Logs
    const cdpAuditLogs: AuditLog[] = [
      {
        id: "audit-cdp-001",
        companyCode: "cdp001",
        userId: cdpUserId,
        userName: "Sashi Singh",
        action: "create",
        entityType: "vendor",
        entityId: "vendor-cdp-001",
        previousValue: null,
        newValue: { name: "Pacific Air Cargo", status: "approved" },
        changes: null,
        metadata: { vendorName: "Pacific Air Cargo" },
        ipAddress: null,
        timestamp: cdpNow,
      },
    ];
    cdpAuditLogs.forEach(log => this.auditLogs.set(log.id, log));
  }

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
}

export const storage = new MemStorage();
