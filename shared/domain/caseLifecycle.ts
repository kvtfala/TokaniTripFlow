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

const transitions: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  draft: ["submitted", "cancelled"],
  submitted: ["in_review", "cancelled"],
  in_review: ["authorised", "cancelled"],
  authorised: ["coordinating", "cancelled"],
  coordinating: ["ready_to_travel", "cancelled"],
  ready_to_travel: ["in_travel", "cancelled"],
  in_travel: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  return transitions[from].includes(to);
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

