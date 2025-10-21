import type { TravelRequest, HistoryEntry } from "@shared/types";
import { ESCALATION_DAYS_THRESHOLD } from "@/data/constants";
import { NotifyAdapter } from "@/data/adapters/NotifyAdapter";

export interface EscalationCheck {
  requestId: string;
  daysPending: number;
  currentApprover: string;
  shouldEscalate: boolean;
}

/**
 * Calculate how many days a request has been pending
 */
function getDaysPending(request: TravelRequest): number {
  const submittedAt = new Date(request.submittedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - submittedAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check a single request for escalation
 */
export function checkRequestForEscalation(
  request: TravelRequest,
  thresholdDays: number = ESCALATION_DAYS_THRESHOLD
): EscalationCheck {
  const daysPending = getDaysPending(request);
  const shouldEscalate =
    (request.status === "in_review" || request.status === "submitted") &&
    daysPending > thresholdDays;

  const currentApprover =
    request.approverFlow && request.approverFlow.length > request.approverIndex
      ? request.approverFlow[request.approverIndex]
      : "unknown";

  return {
    requestId: request.id,
    daysPending,
    currentApprover,
    shouldEscalate,
  };
}

/**
 * Check all pending requests for escalation
 */
export function checkEscalations(
  now: Date,
  pendingRequests: TravelRequest[]
): EscalationCheck[] {
  return pendingRequests.map((req) => checkRequestForEscalation(req));
}

/**
 * Mark a request as escalated and send notification
 */
export async function escalateRequest(
  request: TravelRequest,
  escalatedBy: string
): Promise<TravelRequest> {
  const escalationEntry: HistoryEntry = {
    ts: new Date().toISOString(),
    actor: escalatedBy,
    action: "ESCALATE",
    note: `Request escalated after ${getDaysPending(request)} days pending approval`,
  };

  const currentApprover =
    request.approverFlow && request.approverFlow.length > request.approverIndex
      ? request.approverFlow[request.approverIndex]
      : null;

  // Send notification to current approver
  if (currentApprover) {
    await NotifyAdapter.send(
      currentApprover,
      "Travel Request Escalated - Action Required",
      `Travel request ${request.id} from ${request.employeeName} has been pending for ${getDaysPending(
        request
      )} days and requires your urgent attention.`
    );
  }

  return {
    ...request,
    history: [...request.history, escalationEntry],
  };
}

/**
 * Auto-escalate all qualifying requests
 * Called periodically (e.g., on page mount or via scheduled job)
 */
export async function autoEscalateRequests(
  requests: TravelRequest[],
  systemActorId: string = "system"
): Promise<TravelRequest[]> {
  const checks = checkEscalations(new Date(), requests);
  const toEscalate = checks.filter((c) => c.shouldEscalate);

  const escalatedRequests = await Promise.all(
    requests.map(async (req) => {
      const check = toEscalate.find((c) => c.requestId === req.id);
      if (check) {
        return await escalateRequest(req, systemActorId);
      }
      return req;
    })
  );

  return escalatedRequests;
}
