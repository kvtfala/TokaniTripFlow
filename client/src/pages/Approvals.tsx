import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock, CheckCircle, XCircle, AlertTriangle, Search,
  Filter, X, Eye, ArrowUpDown, ArrowUp, ArrowDown,
  DollarSign, FileText, CheckCircle2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelRequest } from "@shared/types";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { nextApprover, requiresMoreApprovals } from "@/utils/approver";
import { checkRequestForEscalation } from "@/utils/escalation";
import { useToast } from "@/hooks/use-toast";

type SortField = "employee" | "destination" | "date" | "submitted" | "cost";
type SortOrder = "asc" | "desc";
type TabKey = "pending" | "awaiting_quotes" | "all";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  awaiting_quotes: "Awaiting Quotes",
  quotes_submitted: "Quotes Submitted",
};

function daysUntilDeparture(startDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depart = new Date(startDate);
  depart.setHours(0, 0, 0, 0);
  return Math.round((depart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Approvals() {
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState<"approve" | "reject" | null>(null);
  const [bulkComment, setBulkComment] = useState("");

  const [rejectTarget, setRejectTarget] = useState<TravelRequest | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const { data: currentUser } = useQuery<{ id: string; role: string }>({
    queryKey: ["/api/auth/user"],
  });
  const currentUserId = currentUser?.id ?? "manager";
  const isSuperAdmin = currentUser?.role === "super_admin";

  const { data: requests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, approvalType }: { requestId: string; approvalType?: string }) => {
      const res = await apiRequest("POST", `/api/requests/${requestId}/approve`, { comment: "", approvalType });
      return res.json();
    },
    onSuccess: (_data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: variables.approvalType === "pre_approval" ? "Pre-Approved" : "Vinaka! Request Approved",
        description: variables.approvalType === "pre_approval"
          ? "Request sent to coordinator to collect vendor quotes"
          : "Request fully approved and ready for processing",
      });
    },
    onError: () => {
      toast({
        title: "Approval Failed",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment: string }) => {
      return apiRequest("POST", `/api/requests/${requestId}/reject`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Request Rejected",
        description: "The employee will be notified of the decision.",
      });
      setRejectTarget(null);
      setRejectComment("");
    },
    onError: () => {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedIds).map(id => {
        const req = requests.find(r => r.id === id);
        const approvalType = (req?.status === "submitted" || req?.status === "in_review")
          ? "pre_approval"
          : undefined;
        return apiRequest("POST", `/api/requests/${id}/approve`, { comment: bulkComment, approvalType });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Vinaka! Bulk Approval Complete",
        description: `Successfully approved ${selectedIds.size} request(s)`,
      });
      setSelectedIds(new Set());
      setBulkActionMode(null);
      setBulkComment("");
    },
    onError: () => {
      toast({
        title: "Bulk Approval Failed",
        description: "Failed to approve some requests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedIds).map(id =>
        apiRequest("POST", `/api/requests/${id}/reject`, { comment: bulkComment })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Bulk Rejection Complete",
        description: `Successfully rejected ${selectedIds.size} request(s)`,
      });
      setSelectedIds(new Set());
      setBulkActionMode(null);
      setBulkComment("");
    },
    onError: () => {
      toast({
        title: "Bulk Rejection Failed",
        description: "Failed to reject some requests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const allActionable = requests.filter(
    (req) =>
      ["submitted", "in_review", "awaiting_quotes", "quotes_submitted"].includes(req.status) &&
      (isSuperAdmin || nextApprover(req) === currentUserId)
  );

  const pendingRequests = allActionable.filter(r =>
    r.status === "submitted" || r.status === "in_review"
  );
  const awaitingQuotesRequests = allActionable.filter(r =>
    r.status === "awaiting_quotes" || r.status === "quotes_submitted"
  );

  const escalationWarnings = pendingRequests.filter(r => checkRequestForEscalation(r).shouldEscalate);

  const uniqueDepartments = useMemo(() => {
    const deps = new Set(allActionable.map(r => r.department));
    return Array.from(deps).sort();
  }, [allActionable]);

  const hasActiveFilters =
    searchQuery ||
    (filterDepartment && filterDepartment !== "all") ||
    filterStartDate ||
    filterEndDate;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDepartment("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const tabRequests =
    tab === "pending" ? pendingRequests :
    tab === "awaiting_quotes" ? awaitingQuotesRequests :
    allActionable;

  const processedRequests = useMemo(() => {
    let result = [...tabRequests];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.ttrNumber?.toLowerCase().includes(q) ||
        r.employeeName?.toLowerCase().includes(q) ||
        r.destination?.city?.toLowerCase().includes(q) ||
        r.destination?.country?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q)
      );
    }

    if (filterDepartment && filterDepartment !== "all") {
      result = result.filter(r => r.department === filterDepartment);
    }
    if (filterStartDate) {
      result = result.filter(r => new Date(r.startDate) >= new Date(filterStartDate));
    }
    if (filterEndDate) {
      result = result.filter(r => new Date(r.startDate) <= new Date(filterEndDate));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "employee") cmp = a.employeeName.localeCompare(b.employeeName);
      else if (sortField === "destination") cmp = (a.destination?.city ?? "").localeCompare(b.destination?.city ?? "");
      else if (sortField === "date") cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      else if (sortField === "submitted") cmp = new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
      else if (sortField === "cost") cmp = (a.perDiem?.totalFJD ?? 0) - (b.perDiem?.totalFJD ?? 0);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [tabRequests, searchQuery, filterDepartment, filterStartDate, filterEndDate, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedRequests.map(r => r.id)));
    }
  };

  const toggleSelectRequest = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-4 bg-muted rounded w-48 animate-pulse" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-20" />
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6 h-48" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and action pending travel requests
            {isSuperAdmin && (
              <span className="ml-2 text-xs font-medium text-primary">(Super Admin — full access)</span>
            )}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-colors ${tab === "pending" ? "border-primary" : ""}`}
          onClick={() => setTab("pending")}
          data-testid="card-stat-pending"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="stat-pending">{pendingRequests.length}</div>
              <div className="text-sm text-muted-foreground">Pending Approval</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-default"
          data-testid="card-stat-escalations"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-md bg-red-50 dark:bg-red-950">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="stat-escalations">{escalationWarnings.length}</div>
              <div className="text-sm text-muted-foreground">Need Attention</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${tab === "awaiting_quotes" ? "border-primary" : ""}`}
          onClick={() => setTab("awaiting_quotes")}
          data-testid="card-stat-awaiting-quotes"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950">
              <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{awaitingQuotesRequests.length}</div>
              <div className="text-sm text-muted-foreground">Awaiting Quotes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee, destination, department, or purpose..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-approvals"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-foreground text-primary rounded-full">
                {[filterDepartment !== "all", filterStartDate, filterEndDate].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/30">
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger data-testid="select-filter-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Travel Start From</label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                data-testid="input-filter-start-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Travel Start To</label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                data-testid="input-filter-end-date"
              />
            </div>
            {hasActiveFilters && (
              <div className="md:col-span-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-accent/40">
          <CardContent className="p-4">
            {!bulkActionMode ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {selectedIds.size} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkActionMode("reject")}
                    className="gap-2 text-destructive border-destructive"
                    data-testid="button-bulk-reject"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBulkActionMode("approve")}
                    className="gap-2"
                    data-testid="button-bulk-approve"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Selected
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="font-medium text-sm">
                  {bulkActionMode === "approve" ? "Approve" : "Reject"} {selectedIds.size} request(s)
                </div>
                <Textarea
                  placeholder={
                    bulkActionMode === "approve"
                      ? "Optional approval comment..."
                      : "Rejection reason (required)..."
                  }
                  value={bulkComment}
                  onChange={e => setBulkComment(e.target.value)}
                  rows={2}
                  data-testid="input-bulk-comment"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setBulkActionMode(null); setBulkComment(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant={bulkActionMode === "reject" ? "destructive" : "default"}
                    onClick={() => {
                      if (bulkActionMode === "approve") bulkApproveMutation.mutate();
                      else if (bulkComment.trim()) bulkRejectMutation.mutate();
                    }}
                    disabled={
                      (bulkActionMode === "reject" && !bulkComment.trim()) ||
                      bulkApproveMutation.isPending ||
                      bulkRejectMutation.isPending
                    }
                    data-testid="button-confirm-bulk-action"
                  >
                    {bulkApproveMutation.isPending || bulkRejectMutation.isPending
                      ? "Processing..."
                      : `Confirm ${bulkActionMode === "approve" ? "Approval" : "Rejection"}`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs + Table */}
      <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
        <TabsList data-testid="tabs-approvals">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="awaiting_quotes" data-testid="tab-awaiting-quotes">
            Awaiting Quotes
            {awaitingQuotesRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{awaitingQuotesRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {processedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-3">
                <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-muted-foreground font-medium">
                  {tab === "pending"
                    ? "No pending approvals — you're all caught up!"
                    : tab === "awaiting_quotes"
                    ? "No requests awaiting vendor quotes"
                    : "No actionable requests found"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === processedRequests.length}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">TTR #</TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("employee")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        data-testid="sort-employee"
                      >
                        Employee <SortIcon field="employee" />
                      </button>
                    </TableHead>
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
                    <TableHead className="hidden md:table-cell">Department</TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("cost")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
                        data-testid="sort-cost"
                      >
                        Per Diem <SortIcon field="cost" />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
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
                  {processedRequests.map(request => {
                    const escalation = checkRequestForEscalation(request);
                    const daysLeft = daysUntilDeparture(request.startDate);
                    const isUrgent = daysLeft >= 0 && daysLeft <= 7;
                    return (
                      <TableRow
                        key={request.id}
                        className={selectedIds.has(request.id) ? "bg-accent/30" : ""}
                        data-testid={`row-approval-${request.id}`}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(request.id)}
                            onCheckedChange={() => toggleSelectRequest(request.id)}
                            data-testid={`checkbox-select-${request.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold" data-testid={`text-ttr-${request.id}`}>
                            {request.ttrNumber ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium" data-testid={`text-employee-${request.id}`}>
                            {request.employeeName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.position}
                          </div>
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
                          {isUrgent && (
                            <Badge variant="destructive" className="mt-1 text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {daysLeft === 0 ? "Today" : `${daysLeft}d away`}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">{request.department}</div>
                          <div className="text-xs text-muted-foreground">{request.costCentre?.code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium" data-testid={`text-cost-${request.id}`}>
                            FJD {request.perDiem?.totalFJD?.toFixed(2) ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {request.perDiem?.days} days
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={request.status} type="request" />
                            {escalation.shouldEscalate && (
                              <Badge variant="destructive" className="text-xs gap-1 w-fit">
                                <Clock className="w-3 h-3" />
                                {escalation.daysPending}d pending
                              </Badge>
                            )}
                          </div>
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
                            {/* Pre-approval stage: submitted / in_review */}
                            {(request.status === "submitted" || request.status === "in_review") && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setRejectTarget(request)}
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1.5" />
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate({ requestId: request.id, approvalType: "pre_approval" })}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  <DollarSign className="w-4 h-4 mr-1.5" />
                                  Pre-Approve
                                </Button>
                              </>
                            )}

                            {/* Final approval stage: quotes submitted by coordinator */}
                            {request.status === "quotes_submitted" && (
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate({ requestId: request.id })}
                                disabled={approveMutation.isPending}
                                data-testid={`button-final-approve-${request.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Final Approve
                              </Button>
                            )}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Reject dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Reject Travel Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Reject the request from <strong>{rejectTarget?.employeeName}</strong> to{" "}
              <strong>{rejectTarget?.destination?.city}</strong>? They will be notified of the decision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder="Reason for rejection (required)..."
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              rows={3}
              data-testid="input-reject-comment"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => { setRejectTarget(null); setRejectComment(""); }}
              data-testid="button-reject-cancel"
            >
              Keep Request
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rejectTarget && rejectComment.trim()) {
                  rejectMutation.mutate({ requestId: rejectTarget.id, comment: rejectComment });
                }
              }}
              disabled={!rejectComment.trim() || rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
