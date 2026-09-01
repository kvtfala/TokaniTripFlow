import {
  createTravelCaseDraftSchema,
  phaseOneTravelCaseRoutes,
  travelCaseDetailSchema,
  travelCaseSummarySchema,
  type CreateTravelCaseDraft,
  type TravelCaseDetail,
  type TravelCaseSummary,
} from "@shared/contracts/travelCases";
import { z } from "zod";

const travelCaseListSchema = z.array(travelCaseSummarySchema);

export class TravelCaseApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "forbidden" | "not_found" | "conflict" | "validation" | "unknown",
  ) {
    super(message);
    this.name = "TravelCaseApiError";
  }
}

function classifyStatus(status: number): TravelCaseApiError["code"] {
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  return "unknown";
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
    throw new TravelCaseApiError(
      "The travel case request could not be completed.",
      response.status,
      classifyStatus(response.status),
    );
  }

  return schema.parse(await response.json());
}

function casePath(template: string, caseId: string): string {
  return template.replace(":caseId", encodeURIComponent(caseId));
}

export const travelCaseApi = {
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
};

export const travelCaseApiInternals = { casePath, classifyStatus };
