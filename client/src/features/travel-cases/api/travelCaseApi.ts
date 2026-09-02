import {
  createTravelCaseDraftSchema,
  addServiceComponentSchema,
  createOrganisationProviderSchema,
  issueAuthorityToProceedSchema,
  organisationProviderSchema,
  phaseOneTravelCaseRoutes,
  submitTravelCaseSchema,
  travelCaseDetailSchema,
  travelCaseSummarySchema,
  updateTravelCaseDraftSchema,
  type AddServiceComponent,
  type CreateOrganisationProvider,
  type CreateTravelCaseDraft,
  type IssueAuthorityToProceed,
  type OrganisationProvider,
  type SubmitTravelCase,
  type TravelCaseDetail,
  type TravelCaseSummary,
  type UpdateTravelCaseDraft,
} from "@shared/contracts/travelCases";
import { apiErrorEnvelopeSchema, type ApiErrorEnvelope } from "@shared/contracts/api";
import { z } from "zod";

const travelCaseListSchema = z.array(travelCaseSummarySchema);
const providerListSchema = z.array(organisationProviderSchema);

export class TravelCaseApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiErrorEnvelope["error"]["code"] | "unknown",
    readonly correlationId?: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "TravelCaseApiError";
  }
}

function classifyStatus(status: number): TravelCaseApiError["code"] {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation_failed";
  if (status === 429) return "rate_limited";
  if (status === 503) return "service_unavailable";
  return "unknown";
}

async function readApiError(response: Response): Promise<TravelCaseApiError> {
  const body = await response.clone().json().catch(() => null);
  const parsed = apiErrorEnvelopeSchema.safeParse(body);
  if (parsed.success) {
    return new TravelCaseApiError(
      parsed.data.error.message,
      response.status,
      parsed.data.error.code,
      parsed.data.error.correlationId,
      parsed.data.error.fieldErrors,
    );
  }
  return new TravelCaseApiError(
    "The travel case request could not be completed.",
    response.status,
    classifyStatus(response.status),
  );
}

async function requestJson<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.output<TSchema>> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return schema.parse(await response.json());
}

function casePath(template: string, caseId: string): string {
  return template.replace(":caseId", encodeURIComponent(caseId));
}

export const travelCaseApi = {
  listProviders(): Promise<OrganisationProvider[]> {
    return requestJson(phaseOneTravelCaseRoutes.listProviders.path, providerListSchema);
  },

  createProvider(input: CreateOrganisationProvider): Promise<OrganisationProvider> {
    const payload = createOrganisationProviderSchema.parse(input);
    return requestJson(phaseOneTravelCaseRoutes.createProvider.path, organisationProviderSchema, {
      method: phaseOneTravelCaseRoutes.createProvider.method, body: JSON.stringify(payload),
    });
  },
  list(): Promise<TravelCaseSummary[]> {
    return requestJson(phaseOneTravelCaseRoutes.list.path, travelCaseListSchema);
  },

  detail(caseId: string): Promise<TravelCaseDetail> {
    return requestJson(
      casePath(phaseOneTravelCaseRoutes.detail.path, caseId),
      travelCaseDetailSchema,
    );
  },

  createDraft(input: CreateTravelCaseDraft): Promise<TravelCaseDetail> {
    const payload = createTravelCaseDraftSchema.parse(input);
    return requestJson(
      phaseOneTravelCaseRoutes.createDraft.path,
      travelCaseDetailSchema,
      { method: phaseOneTravelCaseRoutes.createDraft.method, body: JSON.stringify(payload) },
    );
  },

  updateDraft(caseId: string, input: UpdateTravelCaseDraft): Promise<TravelCaseDetail> {
    const payload = updateTravelCaseDraftSchema.parse(input);
    return requestJson(
      casePath(phaseOneTravelCaseRoutes.updateDraft.path, caseId),
      travelCaseDetailSchema,
      { method: phaseOneTravelCaseRoutes.updateDraft.method, body: JSON.stringify(payload) },
    );
  },

  addComponent(caseId: string, input: AddServiceComponent): Promise<TravelCaseDetail> {
    const payload = addServiceComponentSchema.parse(input);
    return requestJson(
      casePath(phaseOneTravelCaseRoutes.addComponent.path, caseId),
      travelCaseDetailSchema,
      { method: phaseOneTravelCaseRoutes.addComponent.method, body: JSON.stringify(payload) },
    );
  },

  submit(caseId: string, input: SubmitTravelCase): Promise<TravelCaseDetail> {
    const payload = submitTravelCaseSchema.parse(input);
    return requestJson(
      casePath(phaseOneTravelCaseRoutes.submit.path, caseId),
      travelCaseDetailSchema,
      { method: phaseOneTravelCaseRoutes.submit.method, body: JSON.stringify(payload) },
    );
  },

  issueAuthorityToProceed(caseId: string, input: IssueAuthorityToProceed): Promise<TravelCaseDetail> {
    const payload = issueAuthorityToProceedSchema.parse(input);
    return requestJson(
      casePath(phaseOneTravelCaseRoutes.issueAuthorityToProceed.path, caseId),
      travelCaseDetailSchema,
      { method: phaseOneTravelCaseRoutes.issueAuthorityToProceed.method, body: JSON.stringify(payload) },
    );
  },
};

export const travelCaseApiInternals = { casePath, classifyStatus, readApiError };
