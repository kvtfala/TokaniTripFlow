import type { MembershipRole } from "@shared/schema";

export const documentClassifications = [
  "public", "internal", "confidential", "restricted",
] as const;
export type DocumentClassification = (typeof documentClassifications)[number];

export type CaseAction =
  | "case:create" | "case:read" | "case:coordinate" | "case:approve"
  | "case:authorise" | "case:finance" | "document:upload" | "document:read"
  | "tenant:admin";

const restrictedReaders: readonly MembershipRole[] = [
  "manager", "travel_admin", "organisation_admin",
];

export function canPerform(role: MembershipRole, action: CaseAction): boolean {
  switch (role) {
    case "employee":
      return ["case:create", "case:read", "document:upload", "document:read"].includes(action);
    case "coordinator":
      return ["case:create", "case:read", "case:coordinate", "document:upload", "document:read"].includes(action);
    case "approver":
      return ["case:read", "case:approve", "document:read"].includes(action);
    case "manager":
      return ["case:read", "case:approve", "case:authorise", "document:read"].includes(action);
    case "finance_admin":
      return ["case:read", "case:finance", "document:upload", "document:read"].includes(action);
    case "travel_desk":
      return ["case:read", "case:coordinate", "document:upload", "document:read"].includes(action);
    case "travel_admin":
      return ["case:create", "case:read", "case:coordinate", "case:authorise", "document:upload", "document:read"].includes(action);
    case "organisation_admin":
      return true;
  }
}

export function canReadClassification(
  role: MembershipRole,
  classification: DocumentClassification,
): boolean {
  if (!canPerform(role, "document:read")) return false;
  return classification !== "restricted" || restrictedReaders.includes(role);
}
