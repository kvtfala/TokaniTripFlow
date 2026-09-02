import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { TravelCaseDetail } from "@shared/contracts/travelCases";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProvider, useIssueAuthorityToProceed, useProviders } from "../hooks/useTravelCases";

function iso(value: string) { return new Date(value).toISOString(); }

export function AuthorityToProceedPanel({ travelCase }: { travelCase: TravelCaseDetail }) {
  const { user } = useAuth();
  const canAuthorise = travelCase.availableActions.includes("authorise");
  const providers = useProviders(canAuthorise);
  const createProvider = useCreateProvider();
  const issue = useIssueAuthorityToProceed(travelCase.id);
  const [providerName, setProviderName] = useState("");
  const [providerId, setProviderId] = useState("");
  const authorisedComponentIds = useMemo(
    () => new Set(travelCase.authoritiesToProceed.flatMap((authority) => authority.scopeComponentIds)),
    [travelCase.authoritiesToProceed],
  );
  const remainingComponents = useMemo(
    () => travelCase.components.filter((component) => !authorisedComponentIds.has(component.id)),
    [authorisedComponentIds, travelCase.components],
  );
  const [componentIds, setComponentIds] = useState<string[]>(remainingComponents.map((component) => component.id));
  const [optionReference, setOptionReference] = useState("");
  const [optionVersion, setOptionVersion] = useState("1");
  const [optionValidUntil, setOptionValidUntil] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("FJD");
  const [amountType, setAmountType] = useState<"exact" | "ceiling">("exact");
  const [variation, setVariation] = useState("0");
  const [fundingMethod, setFundingMethod] = useState("account");
  const [lpoRequirement, setLpoRequirement] = useState("after_authority");
  const [fundingReference, setFundingReference] = useState("");
  const [conditions, setConditions] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setComponentIds((current) => current.filter((id) => !authorisedComponentIds.has(id)));
  }, [authorisedComponentIds]);

  if (!canAuthorise && travelCase.authoritiesToProceed.length === 0) return null;

  async function addProvider() {
    setMessage(null);
    try {
      const created = await createProvider.mutateAsync({ legalName: providerName });
      setProviderId(created.id); setProviderName("");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Provider could not be created"); }
  }

  async function submit() {
    setMessage(null);
    try {
      await issue.mutateAsync({
        expectedVersion: travelCase.version, idempotencyKey: crypto.randomUUID(), providerId,
        scopeComponentIds: componentIds, approvedOptionSource: "external_quote",
        approvedOptionReference: optionReference, approvedOptionVersion: Number(optionVersion),
        optionValidUntil: iso(optionValidUntil), amountType, authorisedAmount: Number(amount),
        permittedVariationAmount: amountType === "ceiling" ? Number(variation) : 0,
        currency, fundingMethod: fundingMethod as "lpo_po" | "account" | "transfer" | "card" | "other",
        fundingReference: fundingReference || undefined,
        lpoRequirement: lpoRequirement as "before_authority" | "after_authority" | "not_required",
        conditions: conditions.split("\n").map((item) => item.trim()).filter(Boolean), validUntil: iso(validUntil),
      });
      setMessage("Authority to Proceed issued and recorded in the case audit history.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Authority to Proceed could not be issued"); }
  }

  return <section className="mt-6 rounded-lg border bg-card p-5 sm:p-7" aria-labelledby="atp-title">
    <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /><h3 id="atp-title" className="text-lg font-semibold">Authority to Proceed</h3></div>
    <p className="mt-2 text-sm text-muted-foreground">This authorises only the recorded provider, components, option, amount and validity period. It does not prove payment, booking, ticketing or provider confirmation.</p>
    {message ? <Alert className="mt-4"><AlertDescription>{message}</AlertDescription></Alert> : null}

    {travelCase.authoritiesToProceed.map((authority) => <article key={authority.id} className="mt-4 rounded-md border p-4 text-sm">
      <p className="font-semibold">{authority.authorityNumber} · {authority.providerName}</p>
      <p className="mt-1 text-muted-foreground">{authority.currency} {authority.authorisedAmount.toFixed(2)} · valid until {new Date(authority.validUntil).toLocaleString()}</p>
      <p className="mt-1 text-muted-foreground">Option {authority.approvedOptionReference}, version {authority.approvedOptionVersion}</p>
    </article>)}

    {canAuthorise && remainingComponents.length > 0 ? <div className="mt-6 space-y-5 border-t pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="atp-provider">Eligible provider</Label><select id="atp-provider" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Select provider</option>{providers.data?.map((provider) => <option key={provider.id} value={provider.id}>{provider.tradingName ?? provider.legalName}</option>)}</select></div>
        {user?.role === "travel_admin" ? <div className="space-y-2"><Label htmlFor="provider-name">Add eligible provider</Label><div className="flex gap-2"><Input id="provider-name" value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="Provider legal name" /><Button type="button" variant="outline" disabled={providerName.trim().length < 2 || createProvider.isPending} onClick={addProvider}>Add</Button></div></div> : null}
      </div>

      <fieldset><legend className="text-sm font-medium">Authorised components</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{travelCase.components.map((component) => {
        const alreadyAuthorised = authorisedComponentIds.has(component.id);
        return <label key={component.id} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" disabled={alreadyAuthorised} checked={alreadyAuthorised || componentIds.includes(component.id)} onChange={(event) => setComponentIds((current) => event.target.checked ? [...current, component.id] : current.filter((id) => id !== component.id))} />{component.type.replaceAll("_", " ")}{alreadyAuthorised ? " (authority already issued)" : ""}</label>;
      })}</div></fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="option-reference">Approved option or quotation reference</Label><Input id="option-reference" value={optionReference} onChange={(event) => setOptionReference(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="option-version">Option version</Label><Input id="option-version" type="number" min="1" value={optionVersion} onChange={(event) => setOptionVersion(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="option-expiry">Option valid until</Label><Input id="option-expiry" type="datetime-local" value={optionValidUntil} onChange={(event) => setOptionValidUntil(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="authority-expiry">Authority valid until</Label><Input id="authority-expiry" type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="amount">Authorised amount</Label><Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="currency">Currency</Label><Input id="currency" maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></div>
        <div className="space-y-2"><Label htmlFor="amount-type">Amount rule</Label><select id="amount-type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={amountType} onChange={(event) => setAmountType(event.target.value as "exact" | "ceiling")}><option value="exact">Exact amount</option><option value="ceiling">Maximum ceiling</option></select></div>
        {amountType === "ceiling" ? <div className="space-y-2"><Label htmlFor="variation">Permitted variation amount</Label><Input id="variation" type="number" min="0" step="0.01" value={variation} onChange={(event) => setVariation(event.target.value)} /></div> : null}
        <div className="space-y-2"><Label htmlFor="funding-method">Funding/payment method</Label><select id="funding-method" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={fundingMethod} onChange={(event) => setFundingMethod(event.target.value)}><option value="account">Account</option><option value="lpo_po">PO/LPO</option><option value="transfer">Transfer</option><option value="card">Card</option><option value="other">Other</option></select></div>
        <div className="space-y-2"><Label htmlFor="lpo-rule">PO/LPO requirement</Label><select id="lpo-rule" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={lpoRequirement} onChange={(event) => setLpoRequirement(event.target.value)}><option value="before_authority">Required before authority</option><option value="after_authority">Required after authority</option><option value="not_required">Not required</option></select></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="funding-reference">Funding or PO/LPO reference</Label><Input id="funding-reference" value={fundingReference} onChange={(event) => setFundingReference(event.target.value)} placeholder={lpoRequirement === "before_authority" ? "Required" : "Optional; absence remains visible"} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="conditions">Conditions, one per line</Label><textarea id="conditions" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={conditions} onChange={(event) => setConditions(event.target.value)} /></div>
      </div>
      <Button onClick={submit} disabled={issue.isPending || !providerId || componentIds.length === 0 || !optionReference || !optionValidUntil || !validUntil || !amount || currency.length !== 3}>Issue Authority to Proceed</Button>
    </div> : canAuthorise ? <p className="mt-5 border-t pt-5 text-sm text-muted-foreground">Every component in this case is already covered by an Authority to Proceed.</p> : null}
  </section>;
}
