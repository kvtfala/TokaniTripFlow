import { useState } from "react";
import { useLocation } from "wouter";
import { TravelCaseListView } from "../components/TravelCaseListView";
import { useTravelCases } from "../hooks/useTravelCases";

export default function TravelCaseListPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const travelCases = useTravelCases();

  return (
    <TravelCaseListView
      cases={travelCases.data ?? []}
      isLoading={travelCases.isLoading}
      error={travelCases.error}
      query={query}
      onQueryChange={setQuery}
      onOpenCase={(caseId) => navigate(`/cases/${encodeURIComponent(caseId)}`)}
      onCreateCase={() => navigate("/cases/new")}
      onRetry={() => void travelCases.refetch()}
    />
  );
}
