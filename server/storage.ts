import { type User, type InsertUser } from "@shared/schema";
import type { TravelRequest, DelegateAssignment, CostCentre, HistoryEntry } from "@shared/types";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private travelRequests: Map<string, TravelRequest>;
  private delegations: Map<string, DelegateAssignment>;

  constructor() {
    this.users = new Map();
    this.travelRequests = new Map();
    this.delegations = new Map();
    
    // Seed with sample data
    this.seedSampleData();
  }

  private seedSampleData() {
    // Create 10 diverse sample travel requests for demo/presentation purposes
    const sampleRequests: TravelRequest[] = [
      {
        id: "req-001",
        employeeName: "Jone Vakatawa",
        employeeNumber: "EMP001",
        position: "Senior Analyst",
        department: "Finance",
        employeeId: "employee",
        destination: { code: "SYD", city: "Sydney", country: "Australia" },
        startDate: "2025-11-01",
        endDate: "2025-11-05",
        purpose: "Regional finance conference and client meetings",
        perDiem: { totalFJD: 475, days: 5, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 300, lastDayFJD: 75 },
        visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
        status: "approved",
        submittedAt: "2025-10-15T10:30:00Z",
        costCentre: { code: "800-FIN", name: "Finance" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-15T10:30:00Z", actor: "employee", action: "SUBMIT", note: "Initial submission" },
          { ts: "2025-10-16T09:15:00Z", actor: "manager", action: "APPROVE", note: "Approved by department manager" },
          { ts: "2025-10-16T14:20:00Z", actor: "finance_admin", action: "APPROVE", note: "Budget confirmed, approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: false,
      },
      {
        id: "req-002",
        employeeName: "Miriama Tuisese",
        employeeNumber: "EMP002",
        position: "HR Manager",
        department: "Human Resources",
        employeeId: "employee",
        destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
        startDate: "2025-11-10",
        endDate: "2025-11-13",
        purpose: "Regional HR workshop on talent development and recruitment strategies",
        perDiem: { totalFJD: 360, days: 4, mieFJD: 95, firstDayFJD: 71.25, middleDaysFJD: 190, lastDayFJD: 71.25 },
        visaCheck: { status: "OK", message: "No visa required for New Zealand citizens visiting NZ." },
        status: "approved",
        submittedAt: "2025-10-12T11:00:00Z",
        costCentre: { code: "900-HR", name: "Human Resources" },
        fundingType: "reimbursement",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-12T11:00:00Z", actor: "employee", action: "SUBMIT", note: "Workshop registration confirmed" },
          { ts: "2025-10-13T10:30:00Z", actor: "manager", action: "APPROVE", note: "Approved" },
          { ts: "2025-10-13T15:45:00Z", actor: "finance_admin", action: "APPROVE", note: "Approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
      },
      {
        id: "req-003",
        employeeName: "Seru Tabua",
        employeeNumber: "EMP003",
        position: "IT Specialist",
        department: "IT",
        employeeId: "employee",
        destination: { code: "NAN", city: "Nadi", country: "Fiji" },
        startDate: "2025-10-28",
        endDate: "2025-10-30",
        purpose: "Network infrastructure upgrade at Nadi regional office",
        perDiem: { totalFJD: 204, days: 3, mieFJD: 70, firstDayFJD: 52.5, middleDaysFJD: 70, lastDayFJD: 52.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
        status: "approved",
        submittedAt: "2025-10-10T09:00:00Z",
        costCentre: { code: "700-IT", name: "Information Technology" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-10T09:00:00Z", actor: "employee", action: "SUBMIT", note: "Urgent infrastructure work" },
          { ts: "2025-10-10T13:20:00Z", actor: "manager", action: "APPROVE", note: "Critical project, approved" },
          { ts: "2025-10-11T08:15:00Z", actor: "finance_admin", action: "APPROVE", note: "Approved" },
        ],
        needsFlights: false,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
      },
      {
        id: "req-004",
        employeeName: "Ana Rakoroi",
        employeeNumber: "EMP004",
        position: "Operations Manager",
        department: "Operations",
        employeeId: "employee",
        destination: { code: "SIN", city: "Singapore", country: "Singapore" },
        startDate: "2025-11-20",
        endDate: "2025-11-24",
        purpose: "Regional operations review and process optimization training",
        perDiem: { totalFJD: 600, days: 5, mieFJD: 125, firstDayFJD: 93.75, middleDaysFJD: 375, lastDayFJD: 93.75 },
        visaCheck: { status: "ACTION", message: "Electronic visa required. Apply online 2 weeks before travel." },
        status: "in_review",
        submittedAt: "2025-10-18T14:30:00Z",
        costCentre: { code: "600-OPS", name: "Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 0,
        history: [
          { ts: "2025-10-18T14:30:00Z", actor: "employee", action: "SUBMIT", note: "Training invitation received" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: false,
      },
      {
        id: "req-005",
        employeeName: "Tevita Naicoba",
        employeeNumber: "EMP005",
        position: "Finance Officer",
        department: "Finance",
        employeeId: "employee",
        destination: { code: "LAB", city: "Labasa", country: "Fiji" },
        startDate: "2025-11-05",
        endDate: "2025-11-07",
        purpose: "Quarterly financial audit of northern division offices",
        perDiem: { totalFJD: 204, days: 3, mieFJD: 70, firstDayFJD: 52.5, middleDaysFJD: 70, lastDayFJD: 52.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
        status: "approved",
        submittedAt: "2025-10-14T08:45:00Z",
        costCentre: { code: "800-FIN", name: "Finance" },
        fundingType: "reimbursement",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-14T08:45:00Z", actor: "employee", action: "SUBMIT", note: "Audit schedule confirmed" },
          { ts: "2025-10-15T11:00:00Z", actor: "manager", action: "APPROVE", note: "Approved" },
          { ts: "2025-10-15T16:30:00Z", actor: "finance_admin", action: "APPROVE", note: "Approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: false,
      },
      {
        id: "req-006",
        employeeName: "Salote Vunibola",
        employeeNumber: "EMP006",
        position: "Marketing Coordinator",
        department: "Marketing",
        employeeId: "employee",
        destination: { code: "MEL", city: "Melbourne", country: "Australia" },
        startDate: "2025-12-01",
        endDate: "2025-12-05",
        purpose: "Pacific Tourism Expo - representing Fiji business sector",
        perDiem: { totalFJD: 475, days: 5, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 300, lastDayFJD: 75 },
        visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
        status: "submitted",
        submittedAt: "2025-10-20T10:15:00Z",
        costCentre: { code: "500-MKT", name: "Marketing" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 0,
        history: [
          { ts: "2025-10-20T10:15:00Z", actor: "employee", action: "SUBMIT", note: "Expo registration completed" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: true,
      },
      {
        id: "req-007",
        employeeName: "Ratu Peni Vuniwaqa",
        employeeNumber: "EMP007",
        position: "Senior Consultant",
        department: "Operations",
        employeeId: "employee",
        destination: { code: "SUV", city: "Suva", country: "Fiji" },
        startDate: "2025-11-15",
        endDate: "2025-11-17",
        purpose: "Government stakeholder meetings and policy consultation",
        perDiem: { totalFJD: 204, days: 3, mieFJD: 70, firstDayFJD: 52.5, middleDaysFJD: 70, lastDayFJD: 52.5 },
        visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
        status: "approved",
        submittedAt: "2025-10-08T13:20:00Z",
        costCentre: { code: "600-OPS", name: "Operations" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-08T13:20:00Z", actor: "employee", action: "SUBMIT", note: "Meeting confirmed with ministry" },
          { ts: "2025-10-09T09:00:00Z", actor: "manager", action: "APPROVE", note: "Strategic initiative, approved" },
          { ts: "2025-10-09T14:45:00Z", actor: "finance_admin", action: "APPROVE", note: "Approved" },
        ],
        needsFlights: false,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: true,
      },
      {
        id: "req-008",
        employeeName: "Luisa Matanisiga",
        employeeNumber: "EMP008",
        position: "Training Coordinator",
        department: "Human Resources",
        employeeId: "employee",
        destination: { code: "WLG", city: "Wellington", country: "New Zealand" },
        startDate: "2025-11-25",
        endDate: "2025-11-28",
        purpose: "Leadership development program and Pacific HR network meeting",
        perDiem: { totalFJD: 380, days: 4, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 200, lastDayFJD: 75 },
        visaCheck: { status: "OK", message: "No visa required for New Zealand." },
        status: "rejected",
        submittedAt: "2025-10-17T09:30:00Z",
        costCentre: { code: "900-HR", name: "Human Resources" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 1,
        history: [
          { ts: "2025-10-17T09:30:00Z", actor: "employee", action: "SUBMIT", note: "Program invitation received" },
          { ts: "2025-10-18T11:15:00Z", actor: "manager", action: "REJECT", note: "Budget constraints for Q4, please reschedule for Q1 2026" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: false,
        needsTransport: false,
      },
      {
        id: "req-009",
        employeeName: "Josefa Daurewa",
        employeeNumber: "EMP009",
        position: "Compliance Officer",
        department: "Finance",
        employeeId: "employee",
        destination: { code: "BNE", city: "Brisbane", country: "Australia" },
        startDate: "2025-12-10",
        endDate: "2025-12-14",
        purpose: "Regional compliance workshop on new financial regulations",
        perDiem: { totalFJD: 475, days: 5, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 300, lastDayFJD: 75 },
        visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
        status: "approved",
        submittedAt: "2025-10-11T15:00:00Z",
        costCentre: { code: "800-FIN", name: "Finance" },
        fundingType: "reimbursement",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 2,
        history: [
          { ts: "2025-10-11T15:00:00Z", actor: "employee", action: "SUBMIT", note: "Mandatory compliance training" },
          { ts: "2025-10-12T10:00:00Z", actor: "manager", action: "APPROVE", note: "Critical for regulatory compliance" },
          { ts: "2025-10-12T16:20:00Z", actor: "finance_admin", action: "APPROVE", note: "Approved" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: false,
      },
      {
        id: "req-010",
        employeeName: "Makereta Nawai",
        employeeNumber: "EMP010",
        position: "Project Manager",
        department: "IT",
        employeeId: "employee",
        destination: { code: "HNL", city: "Honolulu", country: "United States" },
        startDate: "2025-12-05",
        endDate: "2025-12-10",
        purpose: "Pacific technology conference and vendor negotiations",
        perDiem: { totalFJD: 900, days: 6, mieFJD: 155, firstDayFJD: 116.25, middleDaysFJD: 620, lastDayFJD: 116.25 },
        visaCheck: { status: "ACTION", message: "US visa required. ESTA may be sufficient for short business trips." },
        status: "submitted",
        submittedAt: "2025-10-21T08:00:00Z",
        costCentre: { code: "700-IT", name: "Information Technology" },
        fundingType: "advance",
        approverFlow: ["manager", "finance_admin"],
        approverIndex: 0,
        history: [
          { ts: "2025-10-21T08:00:00Z", actor: "employee", action: "SUBMIT", note: "Conference speaker invitation confirmed" },
        ],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: true,
        needsTransport: true,
      },
    ];

    sampleRequests.forEach(req => this.travelRequests.set(req.id, req));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
}

export const storage = new MemStorage();
