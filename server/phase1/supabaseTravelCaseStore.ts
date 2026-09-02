import { randomUUID } from "node:crypto";
import type { AddServiceComponent, CreateTravelCaseDraft, SubmitTravelCase, TravelCaseDetail, TravelCaseSummary, UpdateTravelCaseDraft } from "@shared/contracts/travelCases";

interface StoreConfig { url: string; secretKey: string }
interface ActorContext { userId: string; organisationId: string; membershipId: string; role: string; correlationId: string }

export interface SupabaseTravelCaseStore {
  list(actor: ActorContext): Promise<TravelCaseSummary[]>;
  detail(actor: ActorContext, caseId: string): Promise<TravelCaseDetail | null>;
  createDraft(actor: ActorContext, input: CreateTravelCaseDraft): Promise<TravelCaseDetail>;
  updateDraft(actor: ActorContext, caseId: string, input: UpdateTravelCaseDraft): Promise<TravelCaseDetail>;
  addComponent(actor: ActorContext, caseId: string, input: AddServiceComponent): Promise<TravelCaseDetail>;
  submit(actor: ActorContext, caseId: string, input: SubmitTravelCase): Promise<TravelCaseDetail>;
}

export type TravelCaseOperationFailure = "not_found" | "forbidden" | "conflict" | "validation" | "unavailable";
export class TravelCaseOperationError extends Error {
  constructor(readonly failure: TravelCaseOperationFailure) { super(failure); }
}

type JsonRecord = Record<string, any>;

function headers(config: StoreConfig, representation = false) {
  return {
    apikey: config.secretKey,
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/json",
    ...(representation ? { Prefer: "return=representation" } : {}),
  };
}

function summary(row: JsonRecord): TravelCaseSummary {
  const destination = row.destination as JsonRecord | null;
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    title: row.title,
    status: row.status,
    priority: row.priority,
    travellerDisplayName: null,
    destinationDisplayName: destination ? [destination.city, destination.country].filter(Boolean).join(", ") : null,
    startDate: row.start_date,
    endDate: row.end_date,
    currentDependency: row.current_dependency,
    nextAction: row.next_action,
    version: row.version,
    updatedAt: row.updated_at,
  };
}

function availableActions(row: JsonRecord, actor: ActorContext) {
  if (row.status === "draft" && row.owner_membership_id === actor.membershipId) return ["edit", "submit", "upload_document"] as const;
  if (row.status === "submitted" && ["coordinator", "manager", "travel_admin", "organisation_admin"].includes(actor.role)) return ["review", "upload_document"] as const;
  return ["upload_document"] as const;
}

async function request(config: StoreConfig, path: string, init: RequestInit = {}) {
  const response = await fetch(`${config.url}${path}`, { ...init, headers: { ...headers(config), ...init.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as JsonRecord;
    const marker = String(body.message ?? body.code ?? "");
    const failure: TravelCaseOperationFailure =
      marker.includes("not_found") ? "not_found" :
      marker.includes("forbidden") || marker.includes("membership_required") || body.code === "42501" ? "forbidden" :
      marker.includes("version_conflict") || marker.includes("draft_status_required") || body.code === "40001" || body.code === "55000" || body.code === "23505" ? "conflict" :
      marker.includes("empty_patch") || marker.includes("unknown_patch") || marker.includes("traveller_membership") || body.code === "23514" ? "validation" :
      "unavailable";
    throw new TravelCaseOperationError(failure);
  }
  return response;
}

const BROAD_CASE_ROLES = new Set(["coordinator", "travel_desk", "travel_admin", "organisation_admin"]);
function caseQuery(actor: ActorContext, caseId?: string) {
  const params = new URLSearchParams({
    select: "id,organisation_id,reference_number,traveller_user_id,title,purpose,case_type,status,priority,start_date,end_date,destination,funding,required_component_types,owner_membership_id,current_dependency,next_action,version,submitted_at,closed_at,created_at,updated_at",
    organisation_id: `eq.${actor.organisationId}`,
    order: "updated_at.desc",
  });
  if (!BROAD_CASE_ROLES.has(actor.role)) {
    params.set("or", `(owner_membership_id.eq.${actor.membershipId},traveller_user_id.eq.${actor.userId})`);
  }
  if (caseId) params.set("id", `eq.${caseId}`);
  return `/rest/v1/travel_cases?${params}`;
}

async function detailFromRow(config: StoreConfig, actor: ActorContext, row: JsonRecord): Promise<TravelCaseDetail> {
  const params = new URLSearchParams({
    select: "id,type,status,sequence,requirements,provider_id,provider_reference",
    organisation_id: `eq.${actor.organisationId}`,
    travel_case_id: `eq.${row.id}`,
    order: "sequence.asc",
  });
  const componentResponse = await request(config, `/rest/v1/service_components?${params}`);
  const components = await componentResponse.json() as JsonRecord[];
  return {
    ...summary(row),
    purpose: row.purpose,
    caseType: row.case_type,
    travellerUserId: row.traveller_user_id,
    destination: row.destination,
    funding: row.funding,
    components: components.map((component) => ({
      id: component.id, type: component.type, status: component.status,
      sequence: component.sequence, requirements: component.requirements,
      providerId: component.provider_id, providerReference: component.provider_reference,
    })),
    availableActions: [...availableActions(row, actor)],
  };
}

export function createSupabaseTravelCaseStore(config: StoreConfig): SupabaseTravelCaseStore {
  return {
    async list(actor) {
      const response = await request(config, caseQuery(actor));
      return (await response.json() as JsonRecord[]).map(summary);
    },
    async detail(actor, caseId) {
      const response = await request(config, caseQuery(actor, caseId));
      const [row] = await response.json() as JsonRecord[];
      return row ? detailFromRow(config, actor, row) : null;
    },
    async createDraft(actor, input) {
      if (input.travellerUserId) {
        const membership = new URLSearchParams({
          select: "id", organisation_id: `eq.${actor.organisationId}`,
          user_id: `eq.${input.travellerUserId}`, status: "eq.active", limit: "1",
        });
        const membershipResponse = await request(config, `/rest/v1/organisation_memberships?${membership}`);
        if ((await membershipResponse.json() as unknown[]).length === 0) throw new Error("Traveller is not an active organisation member");
      }
      const reference = `TF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const response = await request(config, "/rest/v1/rpc/create_travel_case_draft", {
        method: "POST",
        headers: headers(config, true),
        body: JSON.stringify({
          target_organisation_id: actor.organisationId,
          actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId,
          reference_number: reference,
          title: input.title,
          purpose: input.purpose,
          case_type: input.caseType ?? null,
          priority: input.priority,
          traveller_user_id: input.travellerUserId ?? null,
          start_date: input.startDate ?? null,
          end_date: input.endDate ?? null,
          destination: input.destination ?? null,
          funding: input.funding ?? null,
          required_component_types: input.requiredComponentTypes ?? [],
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json();
      const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async updateDraft(actor, caseId, input) {
      const { expectedVersion, ...patch } = input;
      const response = await request(config, "/rest/v1/rpc/update_travel_case_draft", {
        method: "POST",
        body: JSON.stringify({
          target_organisation_id: actor.organisationId,
          target_case_id: caseId,
          actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId,
          expected_version: expectedVersion,
          patch,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json();
      const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async addComponent(actor, caseId, input) {
      await request(config, "/rest/v1/rpc/add_service_component", {
        method: "POST",
        body: JSON.stringify({
          target_organisation_id: actor.organisationId,
          target_case_id: caseId,
          actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId,
          expected_version: input.expectedVersion,
          request_idempotency_key: input.idempotencyKey,
          component_type: input.type,
          component_sequence: input.sequence,
          requirements: input.requirements,
          correlation_id: actor.correlationId,
        }),
      });
      const updated = await this.detail(actor, caseId);
      if (!updated) throw new TravelCaseOperationError("not_found");
      return updated;
    },
    async submit(actor, caseId, input) {
      const response = await request(config, "/rest/v1/rpc/submit_travel_case", {
        method: "POST",
        body: JSON.stringify({
          target_organisation_id: actor.organisationId,
          target_case_id: caseId,
          actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId,
          expected_version: input.expectedVersion,
          request_idempotency_key: input.idempotencyKey,
          attestation: input.attestation,
          case_type: input.caseType,
          traveller_user_id: input.travellerUserId,
          start_date: input.startDate,
          end_date: input.endDate,
          destination: input.destination,
          funding: input.funding,
          required_component_types: input.requiredComponentTypes,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json();
      const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
  };
}
