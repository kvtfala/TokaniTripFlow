import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { travelCaseApi } from "../api/travelCaseApi";
import { travelCaseQueryKeys } from "../queryKeys";
import type { CreateTravelCaseDraft } from "@shared/contracts/travelCases";

export function useTravelCases() {
  return useQuery({
    queryKey: travelCaseQueryKeys.list(),
    queryFn: () => travelCaseApi.list(),
  });
}

export function useTravelCaseDetail(caseId: string) {
  return useQuery({
    queryKey: travelCaseQueryKeys.detail(caseId),
    queryFn: () => travelCaseApi.detail(caseId),
    enabled: caseId.length > 0,
  });
}

export function useCreateTravelCaseDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTravelCaseDraft) => travelCaseApi.createDraft(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: travelCaseQueryKeys.list() });
    },
  });
}
