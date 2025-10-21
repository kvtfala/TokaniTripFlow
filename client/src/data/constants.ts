import type { UserRole } from "@shared/types";

// User Roles
export const ROLES: UserRole[] = ["employee", "approver", "finance_admin", "travel_admin"];

// Feature Flags
export const FEATURE_FLAGS = {
  MULTI_LEVEL_APPROVALS: true,
  BUDGET_CHECKS: true,
  AUDIT_FLAGS: true,
  DELEGATIONS: true,
  ANALYTICS: true,
  PDF_EXPORT: true,
  FINANCE_EXPORT: true,
} as const;

// Status Colors
export const STATUS_COLORS = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
  submitted: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  in_review: { bg: "bg-amber-100", text: "text-amber-700", label: "In Review" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
} as const;

// Escalation Settings
export const ESCALATION_DAYS_THRESHOLD = 3;

// Budget Warning Threshold
export const BUDGET_WARNING_THRESHOLD = 0.9; // 90% of available budget

// Per Diem Calculation Constants
export const PER_DIEM_FIRST_LAST_DAY_PERCENTAGE = 0.75;
export const PER_DIEM_FULL_DAY_PERCENTAGE = 1.0;

// Default Approval Flow (can be customized per department/level)
export const DEFAULT_APPROVER_FLOW = ["manager", "finance_admin"];

// Mobile Touch Target Minimum Size (px)
export const MIN_TOUCH_TARGET_SIZE = 44;

// Export File Formats
export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];
