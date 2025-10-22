export type RequestStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected";
export type VisaStatus = "OK" | "WARNING" | "ACTION";
export type UserRole = "employee" | "approver" | "finance_admin" | "travel_admin";
export type FundingType = "advance" | "reimbursement";
export type HistoryAction = "SUBMIT" | "APPROVE" | "REJECT" | "ESCALATE" | "COMMENT";

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
  employeeName: string;
  employeeNumber: string;
  position: string;
  department: string;
  employeeId: string;
  destination: Location;
  startDate: string;
  endDate: string;
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
}

export interface ExpenseClaim {
  id: string;
  requestId: string;
  employeeName: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  claimedAt: string;
  status: RequestStatus;
}

export interface DelegateAssignment {
  id: string;
  userId: string;
  actingFor: string;
  startDate: string;
  endDate: string;
  active: boolean;
}
