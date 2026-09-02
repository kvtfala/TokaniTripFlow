import { useLocation, useRoute } from "wouter";
import { AlertCircle, ArrowLeft, LoaderCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTravelCaseDetail } from "../hooks/useTravelCases";
import { AuthorityToProceedPanel } from "../components/AuthorityToProceedPanel";

export default function TravelCaseDetailPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ caseId: string }>("/cases/:caseId");
  const caseId = params?.caseId ?? "";
  const travelCase = useTravelCaseDetail(caseId);

  if (travelCase.isLoading) return <div className="flex min-h-64 items-center justify-center gap-2" role="status"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Loading travel case</div>;
  if (travelCase.error || !travelCase.data) return <div className="mx-auto max-w-xl p-8 text-center" role="alert"><AlertCircle className="mx-auto h-7 w-7 text-destructive" aria-hidden="true" /><h2 className="mt-3 text-xl font-semibold">Travel case not found</h2><p className="mt-2 text-sm text-muted-foreground">The case may not exist or may belong to another organisation.</p><Button className="mt-5" variant="outline" onClick={() => navigate("/cases")}>Back to cases</Button></div>;

  const detail = travelCase.data;
  return (
    <section className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8" aria-labelledby="case-detail-title">
      <Button variant="ghost" onClick={() => navigate("/cases")} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Travel cases</Button>
      <header className="rounded-lg border bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{detail.referenceNumber}</p><h2 id="case-detail-title" className="mt-1 text-3xl font-bold tracking-tight">{detail.title}</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{detail.purpose}</p></div>
          <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-semibold">{detail.status.replaceAll("_", " ")}</span>
        </div>
        <dl className="mt-7 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Traveller</dt><dd className="mt-1 text-sm font-semibold">{detail.travellerDisplayName ?? "Traveller pending"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Destination</dt><dd className="mt-1 flex items-center gap-1 text-sm font-semibold"><MapPin className="h-4 w-4" aria-hidden="true" />{detail.destinationDisplayName ?? "Destination pending"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Current dependency</dt><dd className="mt-1 text-sm font-semibold">{detail.currentDependency ?? "None recorded"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Next action</dt><dd className="mt-1 text-sm font-semibold">{detail.nextAction ?? "None recorded"}</dd></div>
        </dl>
      </header>
      <AuthorityToProceedPanel travelCase={detail} />
    </section>
  );
}
