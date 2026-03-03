import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Plus, Eye, XCircle, Clock, CheckCircle,
  ArrowUpDown, ArrowUp, ArrowDown, FileText, Plane,
  AlertTriangle, DollarSign,
} from "lucide-react";
import type { TravelRequest } from "@shared/types";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortField = "date" | "destination" | "status" | "submitted";
type SortOrder = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  awaiting_quotes: "Awaiting Quotes",
  quotes_submitted: "Quotes Submitted",
  approved: "Approved",
  rejected: "Rejected",
  ticketed: "Ticketed",
};

const ACTIVE_STATUSES = ["draft", "submitted", "in_review", "awaiting_quotes", "quotes_submitted"];
const APPROVED_STATUSES = ["approved", "ticketed"];

function getStatusIcon(status: string) {
  switch (status) {
    case "approved": case "ticketed": return <CheckCircle className="w-3.5 h-3.5" />;
    case "rejected": return <XCircle className="w-3.5 h-3.5" />;
    case "awaiting_quotes": return <DollarSign className="w-3.5 h-3.5" />;
    case "quotes_submitted": return <FileText className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
}

function StatusPill({ status }: { status: string }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border";
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground border-border",
    submitted: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    in_review: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    awaiting_quotes: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
    quotes_submitted: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    approved: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    ticketed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  };
  return (
    <span className={`${base} ${styles[status] ?? styles.draft}`}>
      {getStatusIcon(status)}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function MyTrips() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"active" | "approved" | "rejected">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [cancelTarget, setCancelTarget] = useState<TravelRequest | null>(null);

  const { data: allRequests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setCancelTarget(null);
      toast({ title: "Request cancelled", description: "Your travel request has been cancelled." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not cancel the request. Please try again.", variant: "destructive" });
    },
  });

  const activeRequests = allRequests.filter(r => ACTIVE_STATUSES.includes(r.status));
  const approvedRequests = allRequests.filter(r => APPROVED_STATUSES.includes(r.status));
  const rejectedRequests = allRequests.filter(r => r.status === "rejected");

  const tabRequests =
    tab === "active" ? activeRequests :
    tab === "approved" ? approvedRequests :
    rejectedRequests;

  const processedRequests = useMemo(() => {
    let result = [...tabRequests];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.ttrNumber?.toLowerCase().includes(q) ||
        r.destination?.city?.toLowerCase().includes(q) ||
        r.destination?.country?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.employeeName?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      else if (sortField === "destination") cmp = (a.destination?.city ?? "").localeCompare(b.destination?.city ?? "");
      else if (sortField === "submitted") cmp = new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
      else if (sortField === "status") {
        const order: Record<string, number> = { draft: 1, submitted: 2, in_review: 3, awaiting_quotes: 4, quotes_submitted: 5, approved: 6, rejected: 7, ticketed: 8 };
        cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return result;
  }, [tabRequests, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const canCancel = (r: TravelRequest) => r.status === "draft" || r.status === "submitted";

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-4 bg-muted rounded w-48 animate-pulse" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-20" /></Card>)}
        </div>
        <Card className="animate-pulse"><CardContent className="p-6 h-48" /></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Travel Requests</h1>
          <p className="text-muted-foreground mt-1">Track, view, and manage all your travel requests</p>
        </div>
        <Link href="/request/new">
          <Button data-testid="button-new-request">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-colors ${tab === "active" ? "border-primary" : ""}`}
          onClick={() => setTab("active")}
          data-testid="card-stat-active"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeRequests.length}</div>
              <div className="text-sm text-muted-foreground">Active Requests</div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${tab === "approved" ? "border-primary" : ""}`}
          onClick={() => setTab("approved")}
          data-testid="card-stat-approved"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-md bg-green-50 dark:bg-green-950">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{approvedRequests.length}</div>
              <div className="text-sm text-muted-foreground">Approved / Ticketed</div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${tab === "rejected" ? "border-primary" : ""}`}
          onClick={() => setTab("rejected")}
          data-testid="card-stat-rejected"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-md bg-red-50 dark:bg-red-950">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{rejectedRequests.length}</div>
              <div className="text-sm text-muted-foreground">Rejected / Cancelled</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by destination, purpose, or traveller name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-requests"
        />
      </div>

      {/* Tabs + Table */}
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList data-testid="tabs-request-status">
          <TabsTrigger value="active" data-testid="tab-active">
            Active
            {activeRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{activeRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved
            {approvedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{approvedRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {processedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-3">
                <Plane className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-muted-foreground font-medium">
                  {tab === "active" ? "No active requests" :
                   tab === "approved" ? "No approved requests yet" :
                   "No rejected requests"}
                </p>
                {tab === "active" && (
                  <Link href="/request/new">
                    <Button variant="outline" className="mt-2" data-testid="button-new-request-empty">
                      <Plus className="w-4 h-4 mr-2" />
                      Submit a New Request
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">TTR #</TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("destination")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        data-testid="sort-destination"
                      >
                        Destination <SortIcon field="destination" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("date")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        data-testid="sort-date"
                      >
                        Travel Dates <SortIcon field="date" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Purpose</TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("status")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        data-testid="sort-status"
                      >
                        Status <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("submitted")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        data-testid="sort-submitted"
                      >
                        Submitted <SortIcon field="submitted" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map(request => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer"
                      onClick={() => setLocation(`/requests/${request.id}`)}
                      data-testid={`row-request-${request.id}`}
                    >
                      <TableCell>
                        <span className="text-xs font-semibold" data-testid={`text-ttr-${request.id}`}>
                          {request.ttrNumber ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-destination-${request.id}`}>
                          {request.destination?.city ?? "—"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.destination?.country ?? ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-dates-${request.id}`}>
                          {format(new Date(request.startDate), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          → {format(new Date(request.endDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div
                          className="max-w-[200px] truncate text-sm text-muted-foreground"
                          title={request.purpose}
                        >
                          {request.purpose}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={request.status} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {request.submittedAt
                            ? format(new Date(request.submittedAt), "MMM dd, yyyy")
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={e => e.stopPropagation()}
                        >
                          <Link href={`/requests/${request.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-view-${request.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                          </Link>
                          {canCancel(request) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setCancelTarget(request)}
                              data-testid={`button-cancel-${request.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1.5" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancel Travel Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the trip to{" "}
              <strong>{cancelTarget?.destination?.city}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm-no">Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-cancel-confirm-yes"
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
