export type RequestStatus = "pending" | "approved" | "rejected";
export type VisaStatus = "OK" | "WARNING" | "ACTION";
export type UserRole = "employee" | "manager" | "admin";

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

export interface VisaCheckResult {
  status: VisaStatus;
  message: string;
  policyLink?: string;
}

export interface TravelRequest {
  id: string;
  employeeName: string;
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
