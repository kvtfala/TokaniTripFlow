import type { MembershipRole } from "@shared/schema";

export const documentClassifications = [
  "public", "internal", "confidential", "restricted",
] as const;
export type DocumentClassification = (typeof documentClassifications)[number];

/**
 * Stable capability names are authoritative. Display roles may change by
 * tenant, but the server evaluates these actions together with membership,
 * case scope, delegation and data classification.
 */
export type CaseAction =
  | "case:create"
  | "case:read"
  | "case:edit"
  | "case:submit"
  | "component:create"
  | "component:edit"
  | "case:review"
  | "case:request_information"
  | "case:coordinate"
  | "case:approve"
  | "authority:issue"
  | "finance:manage"
  | "document:upload"
  | "document:read"
  | "tenant:admin";

const roleCapabilities: Record<MembershipRole, readonly CaseAction[]> = {
  employee: [
    "case:create", "case:read", "case:edit", "case:submit", "component:create", "component:edit",
    "document:upload", "document:read",
  ],
  coordinator: [
    "case:create", "case:read", "case:edit", "case:submit", "component:create", "component:edit",
    "case:review", "case:request_information", "case:coordinate", "document:upload", "document:read",
  ],
  approver: ["case:read", "case:approve", "document:read"],
  manager: ["case:read", "case:approve", "authority:issue", "document:read"],
  finance_admin: ["case:read", "finance:manage", "document:upload", "document:read"],
  travel_desk: [
    "case:read", "case:edit", "component:create", "component:edit", "case:review", "case:request_information", "case:coordinate",
    "document:upload", "document:read",
  ],
  travel_admin: [
    "case:create", "case:read", "case:edit", "case:submit", "component:create", "component:edit",
    "case:review", "case:request_information", "case:coordinate", "authority:issue",
    "document:upload", "document:read",
  ],
  // Tenant administration does not imply operational case or document access.
  organisation_admin: ["tenant:admin"],
};

export function canPerform(role: MembershipRole, action: CaseAction): boolean {
  return roleCapabilities[role].includes(action);
}

export interface ClassificationAccessContext {
  /**
   * Must come from an authoritative server-side permission assignment after
   * tenant and case scope have been evaluated. It must not come from the UI or
   * user-editable identity metadata.
   */
  hasRestrictedDataPermission?: boolean;
}

export function canReadClassification(
  role: MembershipRole,
  classification: DocumentClassification,
  context: ClassificationAccessContext = {},
): boolean {
  if (!canPerform(role, "document:read")) return false;
  if (classification !== "restricted") return true;
  return context.hasRestrictedDataPermission === true;
}
