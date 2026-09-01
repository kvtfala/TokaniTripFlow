import type { CaseAction } from "./permissions";

export const phaseOneRoutePolicies = [
  { method: "GET", path: "/api/v1/travel-cases", action: "case:read", scope: "membership", neutralNotFound: false },
  { method: "POST", path: "/api/v1/travel-cases", action: "case:create", scope: "membership", neutralNotFound: false },
  { method: "GET", path: "/api/v1/travel-cases/:caseId", action: "case:read", scope: "case", neutralNotFound: true },
  { method: "PATCH", path: "/api/v1/travel-cases/:caseId/draft", action: "case:edit", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/components", action: "component:create", scope: "case", neutralNotFound: true },
  { method: "POST", path: "/api/v1/travel-cases/:caseId/submission", action: "case:submit", scope: "case", neutralNotFound: true },
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
  "case.add_component": { auditEvent: "case.component_added", idempotency: "required", concurrency: "expected_version" },
  "case.submit": { auditEvent: "case.submitted", idempotency: "required", concurrency: "expected_version" },
} as const;

export type BackendCommand = keyof typeof commandPolicies;
