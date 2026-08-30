import {
  assertCaseTransition,
  assertTenantOwnership,
  type CaseStatus,
} from "@shared/domain/caseLifecycle";
import type { TravelCase } from "@shared/schema";
import type { TravelCaseRepository } from "./travelCaseRepository";

export interface TransitionTravelCaseCommand {
  organisationId: string;
  caseId: string;
  actorMembershipId: string;
  to: CaseStatus;
}

export class ProductionCoreDisabledError extends Error {}
export class TravelCaseNotFoundError extends Error {}
export class ConcurrentTransitionError extends Error {}

export async function transitionTravelCase(
  repository: TravelCaseRepository,
  productionCoreEnabled: boolean,
  command: TransitionTravelCaseCommand,
): Promise<TravelCase> {
  if (!productionCoreEnabled) {
    throw new ProductionCoreDisabledError("TripFlow production core is disabled");
  }

  const current = await repository.findById(command.organisationId, command.caseId);
  if (!current) {
    throw new TravelCaseNotFoundError("Travel case not found");
  }

  assertTenantOwnership(command.organisationId, current.organisationId);
  assertCaseTransition(current.status as CaseStatus, command.to);

  const updated = await repository.transition(
    command.organisationId,
    command.caseId,
    command.actorMembershipId,
    current.status as CaseStatus,
    command.to,
  );
  if (!updated) {
    throw new ConcurrentTransitionError("Travel case changed before the command completed");
  }
  return updated;
}

