import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { travelCases, type TravelCase } from "@shared/schema";
import type { CaseStatus } from "@shared/domain/caseLifecycle";

export interface TravelCaseRepository {
  findById(organisationId: string, caseId: string): Promise<TravelCase | undefined>;
  list(organisationId: string): Promise<TravelCase[]>;
  transition(
    organisationId: string,
    caseId: string,
    actorMembershipId: string,
    from: CaseStatus,
    to: CaseStatus,
  ): Promise<TravelCase | undefined>;
}

export function createTravelCaseRepository(db: Db): TravelCaseRepository {
  return {
    async findById(organisationId, caseId) {
      const [travelCase] = await db
        .select()
        .from(travelCases)
        .where(and(eq(travelCases.id, caseId), eq(travelCases.organisationId, organisationId)))
        .limit(1);
      return travelCase;
    },

    async list(organisationId) {
      return db
        .select()
        .from(travelCases)
        .where(eq(travelCases.organisationId, organisationId));
    },

    async transition(organisationId, caseId, actorMembershipId, from, to) {
      // The update and append-only event are one PostgreSQL statement. If the
      // expected current status or tenant does not match, neither row changes.
      await db.execute(sql`
        WITH updated AS (
          UPDATE travel_cases
             SET status = ${to}, updated_at = now()
           WHERE id = ${caseId}
             AND organisation_id = ${organisationId}
             AND status = ${from}
          RETURNING id, organisation_id
        )
        INSERT INTO case_events (
          organisation_id, travel_case_id, actor_membership_id,
          event_type, from_status, to_status, payload
        )
        SELECT organisation_id, id, ${actorMembershipId},
               'CASE_STATUS_CHANGED', ${from}, ${to}, '{}'::jsonb
          FROM updated
      `);

      const [updated] = await db
        .select()
        .from(travelCases)
        .where(and(
          eq(travelCases.id, caseId),
          eq(travelCases.organisationId, organisationId),
          eq(travelCases.status, to),
        ))
        .limit(1);
      return updated;
    },
  };
}

