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
    // Sample travel request
    const sampleRequest: TravelRequest = {
      id: "req-001",
      employeeName: "Jone Vakatawa",
      employeeNumber: "EMP001",
      position: "Senior Analyst",
      department: "Finance",
      employeeId: "employee",
      destination: {
        code: "SYD",
        city: "Sydney",
        country: "Australia",
      },
      startDate: "2025-11-01",
      endDate: "2025-11-05",
      purpose: "Regional finance conference and client meetings",
      perDiem: {
        totalFJD: 475,
        days: 5,
        mieFJD: 100,
        firstDayFJD: 75,
        middleDaysFJD: 300,
        lastDayFJD: 75,
      },
      visaCheck: {
        status: "ACTION",
        message: "Visa required for Australia. Processing time: 2-4 weeks.",
      },
      status: "in_review",
      submittedAt: "2025-10-15T10:30:00Z",
      costCentre: { code: "800-FIN", name: "Finance" },
      fundingType: "advance",
      approverFlow: ["manager", "finance_admin"],
      approverIndex: 0,
      history: [
        {
          ts: "2025-10-15T10:30:00Z",
          actor: "employee",
          action: "SUBMIT",
          note: "Initial submission",
        },
      ],
      needsFlights: true,
      needsAccommodation: true,
      needsVisa: true,
      needsTransport: false,
    };

    this.travelRequests.set(sampleRequest.id, sampleRequest);
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
