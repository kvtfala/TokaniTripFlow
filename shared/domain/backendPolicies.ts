import type { CaseAction } from "./permissions";

export const phaseOneRoutePolicies = [
  { method: "GET", path: "/api/v1/approval-requirements", action: "case:approve", scope: "membership", neutralNotFound: false },
  { method: "GET", path: "/api/v1/travel-cases", action: "case:read", scope: "membership", neutralNotFound: false },
  { method: "POST", path: "/api/v1/travel-cases", action: "case:create", scope: "membership", neutralNotFound: false },
  { method: "GET", path: "/api/v1/travel-cases/:caseId", action: "case:read", scope: "case", neutralNotFound: true },
  { method: "PATCH", path: "/api/v1/travel-cases/:caseId/draft", action: "case:edit", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/components", action: "component:create", scope: "case", neutralNotFound: true },
  { method: "PATCH", path: "/api/v1/travel-cases/:caseId/components/:componentId", action: "component:edit", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/submission", action: "case:submit", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/review-assignment", action: "case:review", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/information-requests", action: "case:request_information", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/review-outcome", action: "case:review", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/approval-decisions", action: "case:approve", scope: "case", neutralNotFound: true },
] as const satisfies readonly {
  method: "GET" | "POST" | "PATCH";
  path: string;
  action: CaseAction;
  scope: "membership" | "case";
  neutralNotFound: boolean;
}[];

export const commandPolicies = {
  "case.create_draft": { auditEvent: "case.draft_created", idempotency: "recommended", concurrency: "none" },
  "case.update_draft": { auditEvent: "case.draft_updated", idempotency: "none", concurrency: "expected_version" },
  "case.add_component": { auditEvent: "component.added", idempotency: "required", concurrency: "expected_version" },
  "case.update_component": { auditEvent: "component.updated", idempotency: "required", concurrency: "expected_version" },
  "case.submit": { auditEvent: "case.submitted", idempotency: "required", concurrency: "expected_version" },
  "case.claim_review": { auditEvent: "review.claimed", idempotency: "required", concurrency: "expected_version" },
  "case.request_information": { auditEvent: "review.information_requested", idempotency: "required", concurrency: "expected_version" },
  "case.complete_review": { auditEvent: "review.completed", idempotency: "required", concurrency: "expected_version" },
  "case.record_approval_decision": { auditEvent: "approval.decision_recorded", idempotency: "required", concurrency: "database_lock" },
} as const;

export type BackendCommand = keyof typeof commandPolicies;
