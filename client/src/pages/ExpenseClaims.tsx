import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClaimWizard } from "@/components/expenses/ClaimWizard";
import type { ExpenseClaim } from "@shared/types";
import {
  Plus,
  Receipt,
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  ChevronRight,
} from "lucide-react";
import { IconExpense } from "@/components/icons/TokaniIcons";
import { format } from "date-fns";

const STATUS_CONFIG: Record<ExpenseClaim["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  submitted: { label: "Submitted", variant: "outline", icon: Clock },
  under_review: { label: "Under Review", variant: "default", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  paid: { label: "Paid", variant: "default", icon: CheckCircle },
};

function StatusBadge({ status }: { status: ExpenseClaim["status"] }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge variant={cfg.variant} className="gap-1 capitalize" data-testid={`status-${status}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function ClaimCard({ claim, onClick }: { claim: ExpenseClaim; onClick: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-md border border-border hover-elevate cursor-pointer"
      data-testid={`claim-card-${claim.id}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Receipt className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate" data-testid={`text-tcl-${claim.id}`}>
            {claim.tclNumber ?? claim.id}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {claim.travelRequestRef && (
              <span className="font-medium">{claim.travelRequestRef}</span>
            )}
            {claim.travelRequestRef && " · "}
            {claim.lineItems.length} item{claim.lineItems.length !== 1 ? "s" : ""} •{" "}
            {claim.submittedAt
              ? `Submitted ${format(new Date(claim.submittedAt), "d MMM yyyy")}`
              : `Created ${format(new Date(claim.createdAt), "d MMM yyyy")}`}
          </p>
          {claim.reviewNotes && claim.status === "rejected" && (
            <p className="text-xs text-destructive mt-1 truncate">Reason: {claim.reviewNotes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="font-semibold text-sm">{claim.currency} {claim.totalAmount.toFixed(2)}</p>
          <StatusBadge status={claim.status} />
        </div>
        <div className="block sm:hidden">
          <StatusBadge status={claim.status} />
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: typeof Receipt; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimDetailSheet({ claim, onClose }: { claim: ExpenseClaim; onClose: () => void }) {
  const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.draft;
  return (
    <Sheet open onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-claim-detail">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Claim Details
          </SheetTitle>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold" data-testid="text-sheet-tcl">
              {claim.tclNumber ?? claim.id}
            </p>
            <StatusBadge status={claim.status} />
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-md border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee</span>
              <span className="font-medium">{claim.employeeName}</span>
            </div>
            {claim.travelRequestRef && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trip (TTR)</span>
                <span className="font-medium">{claim.travelRequestRef}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>{claim.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{claim.submittedAt ? format(new Date(claim.submittedAt), "d MMM yyyy") : "Not yet submitted"}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{claim.currency} {claim.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Line Items ({claim.lineItems.length})
            </p>
            <div className="space-y-2">
              {claim.lineItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm"
                  data-testid={`line-item-${i}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.merchant || item.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                      {item.date ? ` · ${format(new Date(item.date), "d MMM yyyy")}` : ""}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  <p className="font-semibold shrink-0">{claim.currency} {item.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Review Notes */}
          {claim.reviewNotes && (
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <p className="font-medium text-muted-foreground">Review Note</p>
              <p>{claim.reviewNotes}</p>
            </div>
          )}

          {/* Approval Info */}
          {(claim.status === "approved" || claim.status === "paid") && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm space-y-1">
              <p className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                {claim.status === "paid" ? "Paid" : "Approved"}
              </p>
              {claim.reviewedBy && <p className="text-muted-foreground">by {claim.reviewedBy}</p>}
              {claim.reviewedAt && <p className="text-muted-foreground">{format(new Date(claim.reviewedAt), "d MMM yyyy")}</p>}
            </div>
          )}

          {claim.status === "rejected" && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm space-y-1">
              <p className="font-medium text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </p>
              {claim.reviewedBy && <p className="text-muted-foreground">by {claim.reviewedBy}</p>}
            </div>
          )}

          {/* Link to trip */}
          {claim.requestId && (
            <Link href={`/requests/${claim.requestId}`}>
              <Button variant="outline" className="w-full" data-testid="button-view-trip">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Trip ({claim.travelRequestRef ?? claim.requestId})
              </Button>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function ExpenseClaims() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  const { data: claims = [], isLoading } = useQuery<ExpenseClaim[]>({
    queryKey: ["/api/expense-claims"],
  });

  const filtered = claims.filter(c => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch =
      !search ||
      (c.tclNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.travelRequestRef || c.requestId).toLowerCase().includes(search.toLowerCase()) ||
      c.employeeName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPending = claims
    .filter(c => c.status === "submitted" || c.status === "under_review")
    .reduce((sum, c) => sum + c.totalAmount, 0);
  const totalApproved = claims
    .filter(c => c.status === "approved" || c.status === "paid")
    .reduce((sum, c) => sum + c.totalAmount, 0);
  const draftCount = claims.filter(c => c.status === "draft").length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <IconExpense size={32} accentColor="#1FBED6" />
            <h1 className="text-2xl font-bold" data-testid="heading-expense-claims">Expense Claims</h1>
          </div>
          <p className="text-muted-foreground text-sm">Submit and track your post-trip expense claims</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} data-testid="button-new-claim">
          <Plus className="w-4 h-4 mr-2" />
          New Claim
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Claims" value={String(claims.length)} icon={Receipt} />
        <StatCard label="Pending Review" value={`FJD ${totalPending.toFixed(0)}`} icon={Clock} sub={`${claims.filter(c => ["submitted","under_review"].includes(c.status)).length} claims`} />
        <StatCard label="Approved" value={`FJD ${totalApproved.toFixed(0)}`} icon={CheckCircle} />
        <StatCard label="Drafts" value={String(draftCount)} icon={FileText} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by TCL #, TTR #, or name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-claims"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state-expense">
              <IconExpense size={56} accentColor="#1FBED6" className="mx-auto opacity-40" />
              <h3 className="font-semibold text-base mt-4">
                {claims.length === 0 ? "No expense claims yet" : "No claims match your filters"}
              </h3>
              {claims.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Submit your first claim after returning from an approved trip
                </p>
              )}
              {claims.length === 0 && (
                <Button className="mt-4" onClick={() => setWizardOpen(true)} data-testid="button-new-claim-empty">
                  <Plus className="w-4 h-4 mr-2" />
                  New Claim
                </Button>
              )}
            </div>
          ) : (
            filtered.map(claim => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onClick={() => setSelectedClaim(claim)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ClaimWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />

      {selectedClaim && (
        <ClaimDetailSheet
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
