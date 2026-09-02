import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { travelCaseApi } from "../api/travelCaseApi";
import { travelCaseQueryKeys } from "../queryKeys";
import type { CreateOrganisationProvider, CreateTravelCaseDraft, IssueAuthorityToProceed } from "@shared/contracts/travelCases";

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

export function useProviders(enabled = true) {
  return useQuery({ queryKey: ["travel-cases", "providers"], queryFn: () => travelCaseApi.listProviders(), enabled });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganisationProvider) => travelCaseApi.createProvider(input),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["travel-cases", "providers"] }); },
  });
}

export function useIssueAuthorityToProceed(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueAuthorityToProceed) => travelCaseApi.issueAuthorityToProceed(caseId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: travelCaseQueryKeys.detail(caseId) }),
        queryClient.invalidateQueries({ queryKey: travelCaseQueryKeys.list() }),
      ]);
    },
  });
}
