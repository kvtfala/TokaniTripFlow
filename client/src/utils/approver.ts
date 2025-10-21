import type { TravelRequest, DelegateAssignment } from "@shared/types";

/**
 * Get the next approver in the approval flow
 * @returns userId/email of next approver, or null if approval is complete
 */
export function nextApprover(request: TravelRequest): string | null {
  if (!request.approverFlow || request.approverFlow.length === 0) {
    return null;
  }

  if (request.approverIndex >= request.approverFlow.length) {
    return null; // All approvals complete
  }

  return request.approverFlow[request.approverIndex];
}

/**
 * Get effective approver considering delegation assignments
 * @param userId - Original approver
 * @param delegates - All active delegate assignments
 * @param now - Current timestamp
 * @returns Effective approver (could be delegate)
 */
export function getEffectiveApprover(
  userId: string,
  delegates: DelegateAssignment[],
  now: Date = new Date()
): string {
  const nowStr = now.toISOString().split("T")[0];

  // Find active delegation for this user
  const delegation = delegates.find(
    (d) =>
      d.actingFor === userId &&
      d.active &&
      d.startDate <= nowStr &&
      d.endDate >= nowStr
  );

  return delegation ? delegation.userId : userId;
}

/**
 * Check if a user is authorized to approve a request
 * Considers both direct assignment and delegation
 */
export function isUserAuthorizedToApprove(
  request: TravelRequest,
  userId: string,
  delegates: DelegateAssignment[] = [],
  now: Date = new Date()
): boolean {
  const nextApproverUser = nextApprover(request);
  
  if (!nextApproverUser) {
    return false; // No pending approval
  }

  // Check direct match
  if (userId === nextApproverUser) {
    return true;
  }

  // Check if user is acting as delegate for the next approver
  const effectiveApprover = getEffectiveApprover(nextApproverUser, delegates, now);
  return userId === effectiveApprover;
}

/**
 * Advance the approval to the next level
 * @returns Updated request with incremented approverIndex and updated status
 */
export function advanceApproval(request: TravelRequest): TravelRequest {
  const newIndex = request.approverIndex + 1;
  const isFinalApproval = newIndex >= request.approverFlow.length;

  return {
    ...request,
    approverIndex: newIndex,
    status: isFinalApproval ? "approved" : "in_review",
  };
}

/**
 * Get all pending requests for a specific approver (including delegated)
 */
export function getPendingRequestsForApprover(
  allRequests: TravelRequest[],
  userId: string,
  delegates: DelegateAssignment[] = [],
  now: Date = new Date()
): TravelRequest[] {
  return allRequests.filter((req) => {
    if (req.status !== "in_review" && req.status !== "submitted") {
      return false;
    }

    return isUserAuthorizedToApprove(req, userId, delegates, now);
  });
}

/**
 * Check if request requires more approvals
 */
export function requiresMoreApprovals(request: TravelRequest): boolean {
  return request.approverIndex < request.approverFlow.length;
}
