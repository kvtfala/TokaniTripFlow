import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  DollarSign,
  FileText,
  Star,
  Plane,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { TokaniLogo } from "@/components/brand/TokaniLogo";
import type { TravelRequest, TravelQuote } from "@shared/types";

interface TokenApprovalData {
  request: TravelRequest;
  quotes: TravelQuote[];
  approver: { id: string; name: string } | null;
}

export default function TokenApproval() {
  const { token } = useParams<{ token: string }>();
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultStatus, setResultStatus] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<TokenApprovalData>({
    queryKey: ["/api/token-approve", token],
    queryFn: async () => {
      const res = await fetch(`/api/token-approve/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid approval link");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const res = await apiRequest("POST", `/api/token-approve/${token}`, { action, comment: comment.trim() || undefined });
      return res;
    },
    onSuccess: (data: any) => {
      setSubmitted(true);
      setResultStatus(data.status);
    },
  });

  const cheapestQuote = data?.quotes.length
    ? data.quotes.reduce((min, q) => q.quoteValue < min.quoteValue ? q : min)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <TokaniLogo variant="icon" className="h-16 w-16 mx-auto" />
          <p className="text-muted-foreground">Loading approval request...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <TokaniLogo variant="icon" className="h-16 w-16 mx-auto mb-2" />
            <CardTitle>Invalid Approval Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {(error as any)?.message || "This approval link is invalid or has expired. Please contact the travel coordinator for a new link."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <TokaniLogo variant="icon" className="h-16 w-16 mx-auto mb-2" />
            <CardTitle>Decision Recorded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={decision === "approve" ? "default" : "destructive"}>
              {decision === "approve" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <AlertDescription>
                <strong>Travel request has been {decision === "approve" ? "approved" : "rejected"}.</strong>
                <br />
                Status updated to: <Badge variant="outline">{resultStatus}</Badge>
                <br />
                The travel coordinator has been notified.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              You may close this page. This link is no longer active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { request, quotes, approver } = data;

  const alreadyActioned = !["submitted", "in_review", "quotes_submitted"].includes(request.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-3">
        <TokaniLogo variant="icon" className="h-12 w-12 flex-shrink-0" />
        <div>
          <h1 className="text-lg font-semibold">Tokani TripFlow</h1>
          <p className="text-xs opacity-80">Travel Approval Portal</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Shield className="w-4 h-4 opacity-70" />
          <span className="text-xs opacity-70">Secure Link</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Intro */}
        <Alert>
          <Shield className="w-4 h-4" />
          <AlertDescription>
            {approver ? (
              <>You are viewing this approval request as <strong>{approver.name}</strong>.</>
            ) : (
              <>You have received a secure approval link for this travel request.</>
            )}
            {" "}No login is required — this link is valid for 7 days.
          </AlertDescription>
        </Alert>

        {alreadyActioned && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              This request has already been actioned. Current status: <strong>{request.status}</strong>.
              No further action is required.
            </AlertDescription>
          </Alert>
        )}

        {/* Trip Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Travel Request #{request.id.slice(-8).toUpperCase()}</CardTitle>
                <CardDescription>Submitted {format(new Date(request.submittedAt), "MMMM dd, yyyy")}</CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">{request.status.replace(/_/g, " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Traveller</p>
                  <p className="font-medium">{request.employeeName}</p>
                  <p className="text-sm text-muted-foreground">{request.position} · {request.department}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium">{request.destination.city}, {request.destination.country}</p>
                  <p className="text-sm text-muted-foreground">{request.destination.code}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Travel Dates</p>
                  <p className="font-medium">
                    {format(new Date(request.startDate), "MMM dd")} – {format(new Date(request.endDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Plane className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Trip Type</p>
                  <p className="font-medium capitalize">{request.destination.country === "Fiji" ? "Domestic" : "International"}</p>
                </div>
              </div>
              {request.totalEstimatedBudget !== undefined && (
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Budget</p>
                    <p className="font-medium">FJD {request.totalEstimatedBudget.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-xs text-muted-foreground mb-1">Purpose of Travel</p>
              <p className="text-sm">{request.purpose}</p>
            </div>

            {request.perDiem && (
              <div className="bg-muted rounded-md p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Per Diem Summary</p>
                <p className="text-sm font-medium">FJD {request.perDiem.totalFJD.toFixed(2)} over {request.perDiem.days} days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Comparison */}
        {quotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Vendor Quote Comparison
              </CardTitle>
              <CardDescription>
                {quotes.length} quote{quotes.length !== 1 ? "s" : ""} received — sorted by price
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...quotes].sort((a, b) => a.quoteValue - b.quoteValue).map((quote, idx) => (
                  <div
                    key={quote.id}
                    className={`p-4 rounded-md border space-y-2 ${
                      quote.id === cheapestQuote?.id ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
                    } ${quote.id === request.selectedQuoteId ? "ring-2 ring-primary" : ""}`}
                    data-testid={`quote-card-${quote.id}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p className="font-semibold text-sm">{quote.vendorName}</p>
                      <div className="flex gap-1">
                        {idx === 0 && <Badge variant="outline" className="text-xs text-green-700 border-green-400"><Star className="w-2.5 h-2.5 mr-1" />Cheapest</Badge>}
                        {quote.id === request.selectedQuoteId && <Badge className="text-xs">Selected</Badge>}
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{quote.currency} {quote.quoteValue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Valid until {quote.quoteExpiry ? format(new Date(quote.quoteExpiry), "MMM dd, yyyy") : "N/A"}
                    </p>
                    {quote.attachmentUrl && (
                      <a
                        href={quote.attachmentUrl.startsWith("/objects/") ? quote.attachmentUrl : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        View Official PDF Quote
                      </a>
                    )}
                    {quote.notes && <p className="text-xs text-muted-foreground">{quote.notes}</p>}
                  </div>
                ))}
              </div>

              {request.selectedQuoteId && (
                <div className="mt-4">
                  {(() => {
                    const sel = quotes.find(q => q.id === request.selectedQuoteId);
                    return sel ? (
                      <Alert>
                        <CheckCircle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>Coordinator selected:</strong> {sel.vendorName} — {sel.currency} {sel.quoteValue.toFixed(2)}
                          {request.quoteJustification && (
                            <p className="mt-1 text-sm">Justification: {request.quoteJustification}</p>
                          )}
                        </AlertDescription>
                      </Alert>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Decision Panel */}
        {!alreadyActioned && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Your Decision</CardTitle>
              <CardDescription>
                Review the quotes above and submit your decision. A comment is required when rejecting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="approval-comment">Comments</Label>
                <Textarea
                  id="approval-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any comments or reason for your decision..."
                  rows={4}
                  data-testid="textarea-approval-comment"
                />
              </div>

              {decision === "reject" && !comment.trim() && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>A reason is required when rejecting a travel request.</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    setDecision("approve");
                    submitMutation.mutate("approve");
                  }}
                  disabled={submitMutation.isPending}
                  data-testid="button-token-approve"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {submitMutation.isPending && decision === "approve" ? "Approving..." : "Approve Request"}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    if (!comment.trim()) {
                      setDecision("reject");
                      return;
                    }
                    setDecision("reject");
                    submitMutation.mutate("reject");
                  }}
                  disabled={submitMutation.isPending}
                  data-testid="button-token-reject"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  {submitMutation.isPending && decision === "reject" ? "Rejecting..." : "Reject Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center pb-4">
          Tokani TripFlow · Secure Approval System · Island Travel Technologies (ITT)
        </p>
      </div>
    </div>
  );
}
