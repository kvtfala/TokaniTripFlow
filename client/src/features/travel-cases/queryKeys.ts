export const travelCaseQueryKeys = {
  all: ["travel-cases"] as const,
  list: () => [...travelCaseQueryKeys.all, "list"] as const,
  detail: (caseId: string) => [...travelCaseQueryKeys.all, "detail", caseId] as const,
};
