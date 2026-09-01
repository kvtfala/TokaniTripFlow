import { AlertCircle, ArrowRight, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TravelCaseSummary } from "@shared/contracts/travelCases";

interface TravelCaseListViewProps {
  cases: TravelCaseSummary[];
  isLoading?: boolean;
  error?: Error | null;
  query: string;
  onQueryChange: (query: string) => void;
  onOpenCase: (caseId: string) => void;
  onCreateCase: () => void;
  onRetry: () => void;
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  authorised: "Authorised",
  coordinating: "Coordinating",
  ready_to_travel: "Ready to travel",
  in_travel: "In travel",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function TravelCaseListView({
  cases,
  isLoading = false,
  error,
  query,
  onQueryChange,
  onOpenCase,
  onCreateCase,
  onRetry,
}: TravelCaseListViewProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleCases = normalizedQuery
    ? cases.filter((travelCase) =>
        [
          travelCase.referenceNumber,
          travelCase.title,
          travelCase.travellerDisplayName,
          travelCase.destinationDisplayName,
        ]
          .filter((value): value is string => value !== null)
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
      )
    : cases;

  return (
    <section className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8" aria-labelledby="travel-cases-title">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Production case workspace</p>
          <h2 id="travel-cases-title" className="mt-1 text-3xl font-bold tracking-tight">Travel cases</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tenant-scoped cases returned through the Phase 1 contract.</p>
        </div>
        <Button onClick={onCreateCase}>Create travel case</Button>
      </header>

      <div className="mb-4 flex items-center gap-2 rounded-md border bg-card p-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Search travel cases"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search reference, title or traveller"
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {isLoading && (
        <div className="flex min-h-48 items-center justify-center gap-2 rounded-md border bg-card" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Loading travel cases</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border bg-card p-6 text-center" role="alert">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div><h3 className="font-semibold">Cases are temporarily unavailable</h3><p className="mt-1 text-sm text-muted-foreground">No data has been changed. Try loading the list again.</p></div>
          <Button variant="outline" onClick={onRetry}>Try again</Button>
        </div>
      )}

      {!isLoading && !error && visibleCases.length === 0 && (
        <div className="min-h-48 rounded-md border bg-card p-8 text-center">
          <h3 className="font-semibold">{query ? "No matching cases" : "No travel cases yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{query ? "Try another reference, title or traveller." : "Create the first draft when travel is ready to be requested."}</p>
        </div>
      )}

      {!isLoading && !error && visibleCases.length > 0 && (
        <div className="overflow-hidden rounded-md border bg-card">
          <ul className="divide-y" aria-label="Travel cases">
            {visibleCases.map((travelCase) => (
              <li key={travelCase.id}>
                <button
                  type="button"
                  onClick={() => onOpenCase(travelCase.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[1fr_1fr_auto_1rem] sm:items-center"
                  aria-label={`Open ${travelCase.referenceNumber}: ${travelCase.title}`}
                >
                  <span className="min-w-0"><strong className="block truncate text-sm">{travelCase.referenceNumber} · {travelCase.title}</strong><small className="mt-1 block text-muted-foreground">{travelCase.travellerDisplayName ?? "Traveller pending"}</small></span>
                  <span className="hidden min-w-0 sm:block"><strong className="block truncate text-sm">{travelCase.destinationDisplayName ?? "Destination pending"}</strong><small className="mt-1 block text-muted-foreground">{travelCase.nextAction ?? "No action recorded"}</small></span>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{statusLabels[travelCase.status] ?? travelCase.status}</span>
                  <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
