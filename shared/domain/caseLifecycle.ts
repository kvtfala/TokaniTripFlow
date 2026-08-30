export const caseStatuses = [
  "draft",
  "submitted",
  "in_review",
  "authorised",
  "coordinating",
  "ready_to_travel",
  "in_travel",
  "completed",
  "cancelled",
] as const;

export type CaseStatus = (typeof caseStatuses)[number];

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  switch (from) {
    case "draft": return to === "submitted" || to === "cancelled";
    case "submitted": return to === "in_review" || to === "cancelled";
    case "in_review": return to === "authorised" || to === "cancelled";
    case "authorised": return to === "coordinating" || to === "cancelled";
    case "coordinating": return to === "ready_to_travel" || to === "cancelled";
    case "ready_to_travel": return to === "in_travel" || to === "cancelled";
    case "in_travel": return to === "completed";
    case "completed":
    case "cancelled":
      return false;
  }
}

export function assertCaseTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransitionCase(from, to)) {
    throw new Error(`Invalid travel case transition: ${from} -> ${to}`);
  }
}

export function assertTenantOwnership(
  activeOrganisationId: string,
  resourceOrganisationId: string,
): void {
  if (!activeOrganisationId || activeOrganisationId !== resourceOrganisationId) {
    throw new Error("Tenant access denied");
  }
}
