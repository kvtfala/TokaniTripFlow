export type RequestStatus = 
  | "draft" 
  | "pending"            // Legacy demo status; normalized during migration
  | "submitted"           // Initial submission
  | "in_review"           // Approval in progress
  | "awaiting_quotes"     // Pre-approved to collect vendor quotes
  | "quotes_submitted"    // Coordinator submitted with quotes for final approval
  | "approved"            // Final approval (ready for Travel Desk)
  | "rejected" 
  | "ticketed";           // Travel Desk processed
export type VisaStatus = "OK" | "WARNING" | "ACTION";
export type UserRole = "employee" | "coordinator" | "approver" | "manager" | "finance_admin" | "travel_desk" | "travel_admin" | "super_admin";
export type FundingType = "advance" | "reimbursement";
export type HistoryAction = "SUBMIT" | "APPROVE" | "REJECT" | "ESCALATE" | "COMMENT" | "TICKET" | "QUOTE";
export type TripType = "one-way" | "return" | "multi-city";
export type CabinClass = "economy" | "premium" | "business";
export type CostBand = "< FJD 1,000" | "FJD 1,000-3,000" | "FJD 3,000-5,000" | "> FJD 5,000";
export type PolicyStatus = "in_policy" | "out_of_policy";

export interface Location {
  code: string;
  city: string;
  country: string;
}

export interface PerDiemCalculation {
  totalFJD: number;
  days: number;
  mieFJD: number;
  firstDayFJD: number;
  middleDaysFJD: number;
  lastDayFJD: number;
}

export interface TravelCostBreakdown {
  flights?: number;
  accommodation?: number;
  groundTransfers?: number;
  visaFees?: number;
  perDiem: number;
  totalCost: number;
}

export interface VisaCheckResult {
  status: VisaStatus;
  message: string;
  policyLink?: string;
}

export interface CostCentre {
  code: string;
  name: string;
}

export interface HistoryEntry {
  ts: string;
  actor: string;
  action: HistoryAction;
  note?: string;
}

export interface TravelRequest {
  id: string;
  ttrNumber?: string;
  employeeName: string;
  employeeNumber: string;
  position: string;
  department: string;
  employeeId: string;
  destination: Location;
  startDate: string;
  endDate: string;
  /** Compatibility alias used by older expense and reporting screens. */
  departureDate?: string;
  purpose: string;
  perDiem: PerDiemCalculation;
  visaCheck: VisaCheckResult;
  status: RequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComment?: string;
  
  // Phase 2 fields
  costCentre: CostCentre;
  fundingType: FundingType;
  approverFlow: string[];
  approverIndex: number;
  history: HistoryEntry[];
  auditFlag?: boolean;
  auditNote?: string;
  
  // Services required
  needsFlights?: boolean;
  needsAccommodation?: boolean;
  needsVisa?: boolean;
  needsTransport?: boolean;
  
  // Cost breakdown
  costBreakdown?: TravelCostBreakdown;
  
  // Enhanced fields (Phase 3)
  preferredRoute?: string;          // e.g. "NAN → SYD via AKL"
  totalEstimatedBudget?: number;    // Total budget in FJD
  /** Compatibility alias; new code should use totalEstimatedBudget. */
  estimatedCost?: number;

  // RFQ and Quotes (Phase 3)
  rfqRecipients?: Array<{vendorName: string; email: string; sentAt: string}>;
  selectedQuoteId?: string;
  quoteJustification?: string;
  quoteRequirementOverridden?: boolean;
  quoteOverrideReason?: string;

  // Tokenized approval (Phase 3)
  approvalToken?: string;           // HMAC-signed token for manager email link
  approvalTokenExpiry?: string;     // ISO date string

  // Traveler welfare fields (Travel Command Centre)
  emergencyContactName?: string;    // Name of emergency contact
  emergencyContactPhone?: string;   // Phone number of emergency contact
  countryRiskLevel?: "low" | "medium" | "high"; // DFAT advisory level for destination

  // Transport / travel mode (domestic Fiji routing)
  travelMode?: "Air" | "Land" | "Sea"; // Selected transport mode for this trip
  suggestedModes?: Array<"Air" | "Land" | "Sea">; // Route-intelligence suggestions

  // Tenant scoping
  companyCode?: string; // Company/tenant the request belongs to (e.g. "itt001", "thc001", "khc001")

  // ── TTC Case Management fields (Phase 1) ──────────────────────────────────
  // Tokani Travel Coordination operational metadata. Editable by coordinator /
  // travel_admin / super_admin only. Visible (read-only) to all other roles.
  ttcCaseType?: "complex_travel" | "medical_travel" | "medical_escort" | "official_travel" | "delegation_travel" | "urgent_travel" | "visa_dependent_travel" | "other";
  ttcPriority?: "normal" | "high" | "urgent";
  ttcServiceLevel?: "remote" | "full_service" | "onsite";
  currentDependency?: "tokani" | "client" | "agent" | "approver" | "traveller" | "visa_documents" | "finance" | "none";
  nextAction?: string;         // Free-text next step for coordinator
  followUpDueDate?: string;    // ISO date string (nullable)
  issueFlag?: boolean;         // Coordinator marks problem cases
  caseOwner?: string;          // User ID of assigned coordinator (nullable)
}

export interface TravelQuote {
  id: string;
  requestId: string;
  vendorName: string;
  vendorEmail: string;
  quoteValue: number;
  currency: string;  // e.g. "FJD", "USD", "AUD"
  pnr?: string;  // Reservation/reference number
  quoteExpiry?: string;  // ISO date string
  notes?: string;
  attachmentUrl?: string;
  createdBy: string;  // User ID who logged this quote
  createdAt: string;
  updatedAt: string;
}

export interface QuotePolicy {
  id: string;
  name: string;
  minQuotesDomestic: number;
  minQuotesInternational: number;
  allowOverride: boolean;
  overrideRoles: string[];  // e.g. ["manager", "finance_admin"]
  createdAt: string;
  updatedAt: string;
}

export type ClaimStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "paid";
export type ExpenseCategory = "Meals" | "Accommodation" | "Transport (Local)" | "Flights" | "Visa / Entry Fees" | "Communication" | "Other";

export interface ExpenseLineItem {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  receiptUrl?: string;
  merchantName?: string;
  receiptDate?: string;
  /** Compatibility aliases used by the legacy claims table. */
  merchant?: string;
  date?: string;
  ocrConfidence?: "high" | "medium" | "low";
  notes?: string;
}

export interface ExpenseClaim {
  id: string;
  tclNumber?: string;
  requestId: string;
  travelRequestRef?: string;
  companyCode?: string;
  employeeId: string;
  employeeName: string;
  lineItems: ExpenseLineItem[];
  totalAmount: number;
  currency: string;
  status: ClaimStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  reconciliation?: {
    advanceAmount?: number;
    varianceAmount?: number;
    paymentMethod?: string;
    paidAt?: string;
  };
}

export interface DelegateAssignment {
  id: string;
  userId: string;
  actingFor: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface Traveller {
  id: string;
  name: string;
  employeeNumber: string;
  position: string;
  department: string;
  manager: string;
  managerId?: string;
}

export interface TripSector {
  id: string;
  origin: string;
  destination: string;
  date: string;
}

export interface PolicyCheck {
  status: PolicyStatus;
  reason?: string;
}

export interface WizardFormData {
  travellers: Traveller[];
  isGroupRequest: boolean;
  tripType: TripType;
  origin: string;
  destination: Location | null;
  departureDate: string;
  returnDate: string;
  datesFlexible: boolean;
  flexibilityDays?: number;
  sectors?: TripSector[];
  preferredRoute?: string;
  specialNotes?: string;
  cabinClass: CabinClass;
  costBand: CostBand;
  totalEstimatedBudget?: number;
  fundingCode: string;
  projectCode?: string;
  attachments: File[];
  policyCheck: PolicyCheck;
  primaryApproverId: string;
  additionalApprovers: string[];
  purpose: string;
}
