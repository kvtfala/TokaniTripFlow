import type { MembershipRole } from "@shared/schema";

export const documentClassifications = [
  "public", "internal", "confidential", "restricted",
] as const;
export type DocumentClassification = (typeof documentClassifications)[number];

export type CaseAction =
  | "case:create" | "case:read" | "case:coordinate" | "case:approve"
  | "case:authorise" | "case:finance" | "document:upload" | "document:read"
  | "tenant:admin";

const grants: Record<MembershipRole, readonly CaseAction[]> = {
  employee: ["case:create", "case:read", "document:upload", "document:read"],
  coordinator: ["case:create", "case:read", "case:coordinate", "document:upload", "document:read"],
  approver: ["case:read", "case:approve", "document:read"],
  manager: ["case:read", "case:approve", "case:authorise", "document:read"],
  finance_admin: ["case:read", "case:finance", "document:upload", "document:read"],
  travel_desk: ["case:read", "case:coordinate", "document:upload", "document:read"],
  travel_admin: ["case:create", "case:read", "case:coordinate", "case:authorise", "document:upload", "document:read"],
  organisation_admin: ["case:create", "case:read", "case:coordinate", "case:approve", "case:authorise", "case:finance", "document:upload", "document:read", "tenant:admin"],
};

const restrictedReaders: readonly MembershipRole[] = [
  "manager", "travel_admin", "organisation_admin",
];

export function canPerform(role: MembershipRole, action: CaseAction): boolean {
  return grants[role].includes(action);
}

export function canReadClassification(
  role: MembershipRole,
  classification: DocumentClassification,
): boolean {
  if (!canPerform(role, "document:read")) return false;
  return classification !== "restricted" || restrictedReaders.includes(role);
}

