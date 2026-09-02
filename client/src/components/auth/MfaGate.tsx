import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { TokaniLogo } from "@/components/brand/TokaniLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Factor = { id: string; type: string; friendlyName: string | null; status: string };
type Enrollment = { factorId: string; qrCode: string; secret: string; uri: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "The authentication request could not be completed");
  }
  return response.json() as Promise<T>;
}

export function MfaGate() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifiedFactor = useMemo(() => factors.find((factor) => factor.type === "totp" && factor.status === "verified"), [factors]);
  const factorId = verifiedFactor?.id ?? enrollment?.factorId;

  useEffect(() => {
    api<{ factors: Factor[] }>("/api/v1/auth/mfa/factors")
      .then((result) => setFactors(result.factors))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Authenticator status could not be loaded"))
      .finally(() => setLoading(false));
  }, []);

  async function startEnrollment() {
    setSubmitting(true); setError(null);
    try {
      setEnrollment(await api<Enrollment>("/api/v1/auth/mfa/enroll", { method: "POST", body: "{}" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authenticator setup could not be started");
    } finally { setSubmitting(false); }
  }

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your authenticator app"); return;
    }
    setSubmitting(true); setError(null);
    try {
      const challenge = await api<{ challengeId: string }>("/api/v1/auth/mfa/challenge", {
        method: "POST", body: JSON.stringify({ factorId }),
      });
      await api("/api/v1/auth/mfa/verify", {
        method: "POST", body: JSON.stringify({ factorId, challengeId: challenge.challengeId, code }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/session"] });
      await queryClient.refetchQueries({ queryKey: ["/api/v1/auth/session"] });
    } catch (caught) {
      setCode("");
      setError(caught instanceof Error ? caught.message : "Authentication code could not be verified");
    } finally { setSubmitting(false); }
  }

  async function signOut() {
    await fetch("/api/v1/auth/sign-out", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["/api/v1/auth/session"], null);
  }

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3"><TokaniLogo variant="icon" className="h-12 w-12" /><ShieldCheck className="h-8 w-8 text-primary" aria-hidden="true" /></div>
          <CardTitle>Secure your TripFlow account</CardTitle>
          <CardDescription>Privileged access requires a second factor. Use any standards-based authenticator app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? <div className="flex items-center gap-2" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Checking authenticator status…</div> : null}
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

          {!loading && !verifiedFactor && !enrollment ? (
            <Button onClick={startEnrollment} disabled={submitting} className="w-full">Set up authenticator</Button>
          ) : null}

          {enrollment ? (
            <section className="space-y-4" aria-labelledby="mfa-setup-heading">
              <h2 id="mfa-setup-heading" className="font-semibold">1. Scan this QR code</h2>
              <div className="rounded-md border bg-white p-4 w-fit mx-auto"><img src={enrollment.qrCode} alt="TripFlow authenticator enrollment QR code" className="h-48 w-48" /></div>
              <details className="text-sm"><summary className="cursor-pointer font-medium">Cannot scan the code?</summary><p className="mt-2 text-muted-foreground">Enter this setup key manually:</p><code className="mt-1 block break-all rounded bg-muted p-2 select-all">{enrollment.secret}</code></details>
            </section>
          ) : null}

          {!loading && factorId ? (
            <section className="space-y-3" aria-labelledby="mfa-code-heading">
              <h2 id="mfa-code-heading" className="font-semibold">{enrollment ? "2. Verify setup" : "Enter your authentication code"}</h2>
              <div className="space-y-2"><Label htmlFor="mfa-code">Six-digit code</Label><Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
              <Button onClick={verify} disabled={submitting || code.length !== 6} className="w-full">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Verify and continue</Button>
            </section>
          ) : null}

          <p className="text-sm text-muted-foreground">If you have lost access to your authenticator, contact a TripFlow administrator. Security controls cannot be bypassed from this screen.</p>
          <Button variant="ghost" onClick={signOut} className="w-full">Sign out</Button>
        </CardContent>
      </Card>
    </main>
  );
}
