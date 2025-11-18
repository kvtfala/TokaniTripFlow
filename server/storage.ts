import { type User, type UpsertUser } from "@shared/schema";
import type { TravelRequest, DelegateAssignment, CostCentre, HistoryEntry, TravelQuote, QuotePolicy } from "@shared/types";
import { randomUUID } from "crypto";

export interface IStorage {
  // Replit Auth Integration - User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private travelRequests: Map<string, TravelRequest>;
  private delegations: Map<string, DelegateAssignment>;
  private quotes: Map<string, TravelQuote>;
  private quotePolicy: QuotePolicy | undefined;

  constructor() {
    this.users = new Map();
    this.travelRequests = new Map();
    this.delegations = new Map();
    this.quotes = new Map();
    
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
    //   Role: manager (superuser - full access to all role views)
    
    const testUsers: User[] = [
      {
        id: "user-itt-manager-001",
        email: "desmond.bale@islandtraveltech.com",
        firstName: "Desmond",
        lastName: "Bale",
        profileImageUrl: null,
        role: "manager",
        companyCode: "itt001",
        // bcrypt hash of "itt1235*" - generated with: bcrypt.hash("itt1235*", 10)
        passwordHash: "$2b$10$btwIziGooE5YvHpoZJxjjeYgqya3zJPk2EWmSmW.p2/Ck6r64rUGS",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    // Store demo user
    testUsers.forEach(user => this.users.set(user.id, user));

    // Pacific Foods Group Pte Ltd - Enterprise-scale demo dataset
    // 1,759 annual trips | FJD 2.82M annual spend | 480 employees | 11 departments
    const sampleRequests: TravelRequest[] = [
      {
        id: "req-001",
        employeeName: "Ratu Epeli Cakobau",
        employeeNumber: "PFG-BOD-001",
        position: "Chairman & CEO",
        department: "Board of Directors",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2025-11-01",
        endDate: "2025-11-06",
        purpose: "Pacific Foods Group annual strategic planning retreat with regional subsidiary directors",
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
        employeeName: "Litiana Ravouvou",
        employeeNumber: "PFG-EXE-012",
        position: "Chief Operating Officer",
        department: "Executive Management",
        employeeId: "employee",
        destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
        startDate: "2025-11-10",
        endDate: "2025-11-14",
        purpose: "PFG subsidiary acquisition due diligence and regional expansion planning with NZ partners",
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
        employeeName: "Jone Navuso",
        employeeNumber: "PFG-TRV-047",
        position: "Travel Booking Specialist",
        department: "Travel Operations",
        employeeId: "employee",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        startDate: "2025-10-28",
        endDate: "2025-10-31",
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
        employeeName: "Setareki Tukana",
        employeeNumber: "PFG-VIS-023",
        position: "Visa Processing Manager",
        department: "Visa / Immigration Services",
        employeeId: "employee",
        destination: { code: "SIN", city: "Singapore", country: "Singapore" },
        startDate: "2025-11-20",
        endDate: "2025-11-23",
        purpose: "Regional immigration compliance workshop and embassy liaison meetings for PFG corporate visa program",
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
        employeeName: "Mereoni Delai",
        employeeNumber: "PFG-CSR-089",
        position: "Customer Service Lead",
        department: "Customer Service / Reservations",
        employeeId: "employee",
        destination: { code: "SUV", city: "Suva", country: "Fiji" },
        startDate: "2025-11-05",
        endDate: "2025-11-07",
        purpose: "PFG customer service excellence training and new reservation system rollout at Suva headquarters",
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
        employeeName: "Tevita Raicebe",
        employeeNumber: "PFG-FIN-065",
        position: "Chief Financial Officer",
        department: "Finance & Accounting",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2025-12-01",
        endDate: "2025-12-04",
        purpose: "PFG Q4 financial review with regional auditors and strategic budget planning for FY2026",
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
        employeeName: "Kalisi Radrodro",
        employeeNumber: "PFG-TEC-112",
        position: "Head of Data Analytics",
        department: "Technology & Data",
        employeeId: "employee",
        destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
        startDate: "2025-11-15",
        endDate: "2025-11-18",
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
        employeeName: "Roshni Lal",
        employeeNumber: "PFG-MKT-134",
        position: "Regional Marketing Director",
        department: "Marketing & Sales",
        employeeId: "employee",
        destination: { code: "SIN", city: "Singapore", country: "Singapore" },
        startDate: "2025-11-25",
        endDate: "2025-11-29",
        purpose: "Pacific Foods Group brand launch campaign planning and regional distributor partnership summit",
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
        employeeName: "Apisai Koroiadi",
        employeeNumber: "PFG-CMP-078",
        position: "Compliance & Risk Manager",
        department: "Compliance, Audit, Risk",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2025-12-10",
        endDate: "2025-12-13",
        purpose: "Regional compliance audit coordination and risk management framework implementation for PFG subsidiaries",
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
        employeeName: "Salome Tawake",
        employeeNumber: "PFG-ADM-091",
        position: "Head of Human Resources",
        department: "Administration & HR",
        employeeId: "employee",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        startDate: "2025-12-05",
        endDate: "2025-12-07",
        purpose: "PFG annual HR strategy planning and workforce development initiatives for 480-employee corporate expansion",
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
        employeeName: "Viliame Koroi",
        employeeNumber: "PFG-SUB-145",
        position: "Subsidiary Operations Director",
        department: "Subsidiaries (Combined)",
        employeeId: "employee",
        destination: { code: "APW", city: "Apia", country: "Samoa" },
        startDate: "2025-11-18",
        endDate: "2025-11-21",
        purpose: "Pacific Foods Group subsidiary coordination and regional market expansion strategy for Samoa operations",
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
  }

  // Replit Auth Integration - User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
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
    const newRequest: TravelRequest = {
      ...request,
      id,
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
      name: "Pacific Foods Group Quote Policy",
      minQuotesDomestic: 2,    // Domestic (within Fiji) requires 2 quotes
      minQuotesInternational: 3, // International requires 3 quotes
      allowOverride: true,
      overrideRoles: ["manager", "finance_admin"],
      createdAt: new Date("2025-01-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
    };
  }
}

export const storage = new MemStorage();
