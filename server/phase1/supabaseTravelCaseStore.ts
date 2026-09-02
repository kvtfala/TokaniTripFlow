import { randomUUID } from "node:crypto";
import type { AddServiceComponent, ApprovalDecision, ApprovalWorkItem, ClaimTravelCaseReview, CompleteTravelCaseReview, CreateOrganisationProvider, CreateTravelCaseDraft, IssueAuthorityToProceed, OrganisationProvider, RequestTravelCaseInformation, SubmitTravelCase, TravelCaseDetail, TravelCaseSummary, UpdateServiceComponent, UpdateTravelCaseDraft } from "@shared/contracts/travelCases";

interface StoreConfig { url: string; secretKey: string }
interface ActorContext { userId: string; organisationId: string; membershipId: string; role: string; correlationId: string }

export interface SupabaseTravelCaseStore {
  list(actor: ActorContext): Promise<TravelCaseSummary[]>;
  detail(actor: ActorContext, caseId: string): Promise<TravelCaseDetail | null>;
  createDraft(actor: ActorContext, input: CreateTravelCaseDraft): Promise<TravelCaseDetail>;
  updateDraft(actor: ActorContext, caseId: string, input: UpdateTravelCaseDraft): Promise<TravelCaseDetail>;
  addComponent(actor: ActorContext, caseId: string, input: AddServiceComponent): Promise<TravelCaseDetail>;
  updateComponent(actor: ActorContext, caseId: string, componentId: string, input: UpdateServiceComponent): Promise<TravelCaseDetail>;
  submit(actor: ActorContext, caseId: string, input: SubmitTravelCase): Promise<TravelCaseDetail>;
  claimReview(actor: ActorContext, caseId: string, input: ClaimTravelCaseReview): Promise<TravelCaseDetail>;
  requestInformation(actor: ActorContext, caseId: string, input: RequestTravelCaseInformation): Promise<TravelCaseDetail>;
  completeReview(actor: ActorContext, caseId: string, input: CompleteTravelCaseReview): Promise<TravelCaseDetail>;
  recordApprovalDecision(actor: ActorContext, caseId: string, input: ApprovalDecision): Promise<TravelCaseDetail>;
  listApprovalWork(actor: ActorContext): Promise<ApprovalWorkItem[]>;
  listProviders(actor: ActorContext): Promise<OrganisationProvider[]>;
  createProvider(actor: ActorContext, input: CreateOrganisationProvider): Promise<OrganisationProvider>;
  issueAuthorityToProceed(actor: ActorContext, caseId: string, input: IssueAuthorityToProceed): Promise<TravelCaseDetail>;
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
  if (["draft", "information_required"].includes(row.status) && row.owner_membership_id === actor.membershipId) return ["edit", "submit", "upload_document"] as const;
  if (["submitted", "in_review"].includes(row.status) && ["coordinator", "travel_desk", "travel_admin"].includes(actor.role)) return ["review", "request_information", "upload_document"] as const;
  if (row.status === "awaiting_approval" && ["approver", "manager", "finance_admin"].includes(actor.role)) return ["approve", "upload_document"] as const;
  if (["approved", "authorised"].includes(row.status) && ["coordinator", "travel_admin"].includes(actor.role)) return ["authorise", "upload_document"] as const;
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
      marker.includes("version_conflict") || marker.includes("status_required") || marker.includes("already_assigned") || body.code === "40001" || body.code === "55000" || body.code === "23505" ? "conflict" :
      marker.includes("empty_patch") || marker.includes("unknown_patch") || marker.includes("traveller_membership") || marker.includes("response_summary") || body.code === "23514" ? "validation" :
      "unavailable";
    throw new TravelCaseOperationError(failure);
  }
  return response;
}

const BROAD_CASE_ROLES = new Set(["coordinator", "travel_desk", "travel_admin"]);
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
  const assignmentParams = new URLSearchParams({
    select: "coordinator_membership_id", organisation_id: `eq.${actor.organisationId}`,
    travel_case_id: `eq.${row.id}`, released_at: "is.null", limit: "1",
  });
  const informationParams = new URLSearchParams({
    select: "id,reason,requested_fields,due_date,requested_at,travel_case_information_responses(responded_at)",
    organisation_id: `eq.${actor.organisationId}`, travel_case_id: `eq.${row.id}`, order: "requested_at.desc",
  });
  const approvalParams = new URLSearchParams({
    select: "id,cycle_number,status,approval_requirements(id,stage_sequence,subject,required_role,status,due_at)",
    organisation_id: `eq.${actor.organisationId}`, travel_case_id: `eq.${row.id}`,
    order: "cycle_number.desc", limit: "1",
  });
  const authorityParams = new URLSearchParams({
    select: "id,authority_number,provider_id,provider_snapshot,scope_component_ids,approved_option_source,approved_option_reference,approved_option_version,amount_type,authorised_amount,permitted_variation_amount,currency,funding_method,funding_reference,lpo_requirement,conditions,valid_until,issued_at",
    organisation_id: `eq.${actor.organisationId}`, travel_case_id: `eq.${row.id}`, order: "issued_at.desc",
  });
  const [componentResponse, assignmentResponse, informationResponse, approvalResponse, authorityResponse] = await Promise.all([
    request(config, `/rest/v1/service_components?${params}`),
    request(config, `/rest/v1/travel_case_review_assignments?${assignmentParams}`),
    request(config, `/rest/v1/travel_case_information_requests?${informationParams}`),
    request(config, `/rest/v1/approval_cycles?${approvalParams}`),
    request(config, `/rest/v1/authorities_to_proceed?${authorityParams}`),
  ]);
  const components = await componentResponse.json() as JsonRecord[];
  const [assignment] = await assignmentResponse.json() as JsonRecord[];
  const informationRequests = await informationResponse.json() as JsonRecord[];
  const [approvalCycle] = await approvalResponse.json() as JsonRecord[];
  const authorities = await authorityResponse.json() as JsonRecord[];
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
    coordinatorMembershipId: assignment?.coordinator_membership_id ?? null,
    informationRequests: informationRequests.map((item) => ({
      id: item.id, reason: item.reason, requestedFields: item.requested_fields,
      dueDate: item.due_date, requestedAt: item.requested_at,
      respondedAt: item.travel_case_information_responses?.[0]?.responded_at ?? null,
    })),
    approval: approvalCycle ? {
      cycleId: approvalCycle.id, cycleNumber: approvalCycle.cycle_number, status: approvalCycle.status,
      requirements: (approvalCycle.approval_requirements ?? []).map((item: JsonRecord) => ({
        id: item.id, stageSequence: item.stage_sequence, subject: item.subject,
        requiredRole: item.required_role, status: item.status, dueAt: item.due_at,
      })).sort((a: JsonRecord, b: JsonRecord) => a.stageSequence - b.stageSequence),
    } : null,
    authoritiesToProceed: authorities.map((authority) => ({
      id: authority.id, authorityNumber: authority.authority_number, providerId: authority.provider_id,
      providerName: authority.provider_snapshot?.trading_name ?? authority.provider_snapshot?.legal_name ?? "Provider",
      scopeComponentIds: authority.scope_component_ids, approvedOptionSource: authority.approved_option_source,
      approvedOptionReference: authority.approved_option_reference, approvedOptionVersion: authority.approved_option_version,
      amountType: authority.amount_type, authorisedAmount: Number(authority.authorised_amount),
      permittedVariationAmount: Number(authority.permitted_variation_amount), currency: authority.currency,
      fundingMethod: authority.funding_method, fundingReference: authority.funding_reference,
      lpoRequirement: authority.lpo_requirement, conditions: authority.conditions,
      validUntil: authority.valid_until, issuedAt: authority.issued_at,
    })),
    availableActions: [...availableActions(row, actor)],
  };
}

export function createSupabaseTravelCaseStore(config: StoreConfig): SupabaseTravelCaseStore {
  return {
    async listProviders(actor) {
      const params = new URLSearchParams({
        select: "id,legal_name,trading_name,external_reference,status",
        organisation_id: `eq.${actor.organisationId}`, status: "eq.eligible", order: "legal_name.asc",
      });
      const response = await request(config, `/rest/v1/organisation_providers?${params}`);
      return (await response.json() as JsonRecord[]).map((provider) => ({
        id: provider.id, legalName: provider.legal_name, tradingName: provider.trading_name,
        externalReference: provider.external_reference, status: provider.status,
      }));
    },
    async createProvider(actor, input) {
      const response = await request(config, "/rest/v1/rpc/create_organisation_provider", {
        method: "POST", body: JSON.stringify({
          target_organisation_id: actor.organisationId, actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId, provider_legal_name: input.legalName,
          provider_trading_name: input.tradingName ?? null,
          provider_external_reference: input.externalReference ?? null, correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json(); const provider = Array.isArray(body) ? body[0] : body;
      return { id: provider.id, legalName: provider.legal_name, tradingName: provider.trading_name,
        externalReference: provider.external_reference, status: provider.status };
    },
    async listApprovalWork(actor) {
      const response = await request(config, "/rest/v1/rpc/list_pending_approval_work", {
        method: "POST", body: JSON.stringify({ target_organisation_id: actor.organisationId, actor_user_id: actor.userId, actor_membership_id: actor.membershipId }),
      });
      return (await response.json() as JsonRecord[]).map((row) => ({
        requirementId: row.requirement_id, travelCaseId: row.travel_case_id,
        referenceNumber: row.reference_number, title: row.title, stageSequence: row.stage_sequence,
        subject: row.subject, requiredRole: row.required_role, dueAt: row.due_at,
        submissionSnapshotId: row.submission_snapshot_id, subjectVersion: row.subject_version,
      }));
    },
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
    async updateComponent(actor, caseId, componentId, input) {
      await request(config, "/rest/v1/rpc/update_service_component", {
        method: "POST",
        body: JSON.stringify({
          target_organisation_id: actor.organisationId, target_case_id: caseId,
          target_component_id: componentId, actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId, expected_version: input.expectedVersion,
          request_idempotency_key: input.idempotencyKey, component_sequence: input.sequence ?? null,
          requirements: input.requirements ?? null, disposition: input.disposition ?? null,
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
          expected_status: input.expectedStatus,
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
          response_summary: input.responseSummary ?? null,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json();
      const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async claimReview(actor, caseId, input) {
      const response = await request(config, "/rest/v1/rpc/claim_travel_case_review", {
        method: "POST", body: JSON.stringify({
          target_organisation_id: actor.organisationId, target_case_id: caseId,
          actor_user_id: actor.userId, actor_membership_id: actor.membershipId,
          expected_version: input.expectedVersion, request_idempotency_key: input.idempotencyKey,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json(); const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async requestInformation(actor, caseId, input) {
      const response = await request(config, "/rest/v1/rpc/request_travel_case_information", {
        method: "POST", body: JSON.stringify({
          target_organisation_id: actor.organisationId, target_case_id: caseId,
          actor_user_id: actor.userId, actor_membership_id: actor.membershipId,
          expected_version: input.expectedVersion, request_idempotency_key: input.idempotencyKey,
          reason: input.reason, requested_fields: input.requestedFields, due_date: input.dueDate ?? null,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json(); const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async completeReview(actor, caseId, input) {
      const response = await request(config, "/rest/v1/rpc/complete_travel_case_review", {
        method: "POST", body: JSON.stringify({
          target_organisation_id: actor.organisationId, target_case_id: caseId,
          actor_user_id: actor.userId, actor_membership_id: actor.membershipId,
          expected_version: input.expectedVersion, request_idempotency_key: input.idempotencyKey,
          policy_evaluation: input.policyEvaluation, review_notes: input.notes ?? null,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json(); const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async recordApprovalDecision(actor, caseId, input) {
      const response = await request(config, "/rest/v1/rpc/record_approval_decision", {
        method: "POST", body: JSON.stringify({
          target_organisation_id: actor.organisationId, target_case_id: caseId,
          target_requirement_id: input.requirementId, actor_user_id: actor.userId,
          actor_membership_id: actor.membershipId, request_idempotency_key: input.idempotencyKey,
          requested_decision: input.decision, decision_reason: input.reason,
          correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json(); const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
    async issueAuthorityToProceed(actor, caseId, input) {
      const response = await request(config, "/rest/v1/rpc/issue_authority_to_proceed", {
        method: "POST", body: JSON.stringify({
          target_organisation_id: actor.organisationId, target_case_id: caseId,
          actor_user_id: actor.userId, actor_membership_id: actor.membershipId,
          expected_version: input.expectedVersion, request_idempotency_key: input.idempotencyKey,
          target_provider_id: input.providerId, requested_scope_component_ids: input.scopeComponentIds,
          approved_option_source: input.approvedOptionSource,
          approved_option_reference: input.approvedOptionReference,
          approved_option_version: input.approvedOptionVersion, option_valid_until: input.optionValidUntil,
          amount_type: input.amountType, authorised_amount: input.authorisedAmount,
          permitted_variation_amount: input.permittedVariationAmount, currency: input.currency,
          funding_method: input.fundingMethod, funding_reference: input.fundingReference ?? null,
          lpo_requirement: input.lpoRequirement, authority_conditions: input.conditions,
          authority_valid_until: input.validUntil, correlation_id: actor.correlationId,
        }),
      });
      const body = await response.json(); const row = Array.isArray(body) ? body[0] : body;
      return detailFromRow(config, actor, row);
    },
  };
}
