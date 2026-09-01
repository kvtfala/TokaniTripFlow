import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTravelCaseDraftSchema } from "@shared/contracts/travelCases";
import { useCreateTravelCaseDraft } from "../hooks/useTravelCases";

export default function CreateTravelCaseDraftPage() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const createDraft = useCreateTravelCaseDraft();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage(null);
    const result = createTravelCaseDraftSchema.safeParse({ title, purpose });
    if (!result.success) {
      setValidationMessage("Enter a case title and purpose before saving the draft.");
      return;
    }

    const created = await createDraft.mutateAsync(result.data);
    navigate(`/cases/${encodeURIComponent(created.id)}`);
  }

  return (
    <section className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8" aria-labelledby="new-case-title">
      <Button variant="ghost" onClick={() => navigate("/cases")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Travel cases
      </Button>
      <div className="rounded-lg border bg-card p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">New travel case</p>
        <h2 id="new-case-title" className="mt-1 text-3xl font-bold tracking-tight">Create the initial draft</h2>
        <p className="mt-2 text-sm text-muted-foreground">Only the title and purpose are required. Drafts are editable and are not billable submissions.</p>

        <form className="mt-8 space-y-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="case-title">Case title</Label>
            <Input id="case-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required aria-describedby="case-title-help" />
            <p id="case-title-help" className="text-xs text-muted-foreground">Use a short operational description, such as Regional planning workshop.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-purpose">Purpose of travel</Label>
            <Textarea id="case-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={4000} required rows={6} />
          </div>

          {validationMessage && <p className="flex items-center gap-2 text-sm text-destructive" role="alert"><AlertCircle className="h-4 w-4" aria-hidden="true" />{validationMessage}</p>}
          {createDraft.error && <p className="flex items-center gap-2 text-sm text-destructive" role="alert"><AlertCircle className="h-4 w-4" aria-hidden="true" />The draft could not be saved. No formal submission was created.</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/cases")}>Cancel</Button>
            <Button type="submit" disabled={createDraft.isPending}>{createDraft.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}Save draft</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
