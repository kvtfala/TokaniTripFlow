import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Clock, AlertTriangle, Flag, Search, Filter, X, CheckCircle2, XCircle as XCircleIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelRequest, HistoryEntry } from "@shared/types";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { nextApprover, requiresMoreApprovals } from "@/utils/approver";
import { checkRequestForEscalation } from "@/utils/escalation";
import { useToast } from "@/hooks/use-toast";

export default function Approvals() {
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [auditFlag, setAuditFlag] = useState(false);
  const [auditNote, setAuditNote] = useState("");
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  
  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState<"approve" | "reject" | null>(null);
  const [bulkComment, setBulkComment] = useState("");
  
  const { toast } = useToast();

  // Fetch current logged-in user for permission checks
  const { data: currentUser } = useQuery<{ id: string; role: string }>({
    queryKey: ["/api/auth/user"],
  });
  const currentUserId = currentUser?.id ?? "manager";
  const isSuperAdmin = currentUser?.role === "super_admin";

  const { data: requests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/requests/${requestId}/approve`, { comment, auditFlag, auditNote });
      return res.json();
    },
    onSuccess: (data: any) => {
      const needsMoreApprovals = data && requiresMoreApprovals(data);
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Vinaka! Request Approved",
        description: needsMoreApprovals 
          ? "Request advanced to next approval level" 
          : "Request fully approved and ready for processing",
      });
      resetForm();
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
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/reject`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Request Rejected",
        description: "Request has been rejected and employee will be notified",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedRequest(null);
    setActionMode(null);
    setComment("");
    setAuditFlag(false);
    setAuditNote("");
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate(selectedRequest.id);
  };

  const handleReject = () => {
    if (!selectedRequest || !comment.trim()) return;
    rejectMutation.mutate(selectedRequest.id);
  };

  // Filter requests pending for current user
  // Super admin sees ALL pending requests across all approvers
  const basePendingRequests = requests.filter(
    (req) =>
      (req.status === "submitted" || req.status === "in_review") &&
      (isSuperAdmin || nextApprover(req) === currentUserId)
  );

  // Apply search and filters
  const pendingRequests = useMemo(() => {
    let result = [...basePendingRequests];

    // Apply search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(req =>
        req.employeeName.toLowerCase().includes(searchLower) ||
        req.destination.city.toLowerCase().includes(searchLower) ||
        req.destination.country.toLowerCase().includes(searchLower) ||
        req.department.toLowerCase().includes(searchLower)
      );
    }

    // Apply department filter
    if (filterDepartment && filterDepartment !== "all") {
      result = result.filter(req => req.department === filterDepartment);
    }

    // Apply date range filters
    if (filterStartDate) {
      result = result.filter(req => new Date(req.startDate) >= new Date(filterStartDate));
    }
    if (filterEndDate) {
      result = result.filter(req => new Date(req.startDate) <= new Date(filterEndDate));
    }

    return result;
  }, [basePendingRequests, searchQuery, filterDepartment, filterStartDate, filterEndDate]);

  // Get unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const deps = new Set(basePendingRequests.map(r => r.department));
    return Array.from(deps).sort();
  }, [basePendingRequests]);

  const escalationWarnings = pendingRequests
    .map((req) => checkRequestForEscalation(req))
    .filter((check) => check.shouldEscalate);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDepartment("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const hasActiveFilters = searchQuery || (filterDepartment && filterDepartment !== "all") || filterStartDate || filterEndDate;

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === pendingRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const toggleSelectRequest = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedIds).map(id =>
        apiRequest("POST", `/api/requests/${id}/approve`, { comment: bulkComment })
      );
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Travel Request Approvals</h1>
          <p className="text-muted-foreground">Review and approve pending travel requests</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded"></div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-96 bg-muted rounded"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Travel Request Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve pending travel requests
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-[hsl(var(--lagoon-light))] to-[hsl(var(--lagoon-light))] border-[hsl(var(--lagoon))] border-opacity-20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--lagoon))]" data-testid="stat-pending">
                  {basePendingRequests.length}
                </div>
                <div className="text-sm text-muted-foreground">Pending Approvals</div>
              </div>
              <Clock className="w-8 h-8 text-[hsl(var(--lagoon))]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--coral-light))] to-[hsl(var(--coral-light))] border-[hsl(var(--coral))] border-opacity-20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--coral))]" data-testid="stat-escalations">
                  {escalationWarnings.length}
                </div>
                <div className="text-sm text-muted-foreground">Need Attention</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-[hsl(var(--coral))]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--ocean-light))] to-[hsl(var(--ocean-light))] border-[hsl(var(--ocean))] border-opacity-20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--ocean))]" data-testid="stat-selected">
                  {selectedIds.size}
                </div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--ocean))]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee, destination, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {[filterDepartment !== "all", filterStartDate, filterEndDate].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
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
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    data-testid="input-filter-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Travel Start To</label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
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
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="mb-6 bg-accent/50">
          <CardContent className="p-4">
            {!bulkActionMode ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {selectedIds.size} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkActionMode("reject")}
                    className="gap-2 border-[hsl(var(--coral))] text-[hsl(var(--coral))]"
                    data-testid="button-bulk-reject"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBulkActionMode("approve")}
                    className="gap-2 bg-[hsl(var(--lagoon))] hover:bg-[hsl(var(--lagoon))]/90"
                    data-testid="button-bulk-approve"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Selected
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {bulkActionMode === "approve" ? "Bulk Approve" : "Bulk Reject"} ({selectedIds.size} requests)
                  </span>
                </div>
                <Textarea
                  placeholder={bulkActionMode === "approve" ? "Optional comment..." : "Rejection reason (required)..."}
                  value={bulkComment}
                  onChange={(e) => setBulkComment(e.target.value)}
                  rows={2}
                  data-testid="input-bulk-comment"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkActionMode(null);
                      setBulkComment("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className={bulkActionMode === "approve" ? "bg-[hsl(var(--lagoon))]" : "bg-[hsl(var(--coral))]"}
                    onClick={() => {
                      if (bulkActionMode === "approve") {
                        bulkApproveMutation.mutate();
                      } else {
                        if (bulkComment.trim()) {
                          bulkRejectMutation.mutate();
                        }
                      }
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

      {escalationWarnings.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {escalationWarnings.length} request(s) have been pending for more than 3 days
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Pending Approvals ({pendingRequests.length})
            </h2>
            {pendingRequests.length > 0 && (
              <label
                className="flex items-center gap-2 cursor-pointer text-sm font-medium select-none px-2 py-1 rounded-md hover-elevate"
                data-testid="button-select-all"
              >
                <Checkbox
                  checked={selectedIds.size === pendingRequests.length}
                  onCheckedChange={toggleSelectAll}
                />
                Select All
              </label>
            )}
          </div>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-[hsl(var(--lagoon))] mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
                    <p className="text-muted-foreground">
                      No pending travel requests to review at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((request) => {
                  const escalation = checkRequestForEscalation(request);
                  return (
                    <Card
                      key={request.id}
                      className={`cursor-pointer transition-colors ${
                        selectedRequest?.id === request.id ? "border-primary" : ""
                      } ${selectedIds.has(request.id) ? "bg-accent/30" : ""}`}
                      onClick={() => setSelectedRequest(request)}
                      data-testid={`card-request-${request.id}`}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedIds.has(request.id)}
                            onCheckedChange={(checked) => {
                              toggleSelectRequest(request.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                            data-testid={`checkbox-select-${request.id}`}
                          />
                          <div className="flex-1 flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {request.employeeName}
                              </CardTitle>
                              <CardDescription>
                                {request.destination.city}, {request.destination.country}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <StatusBadge status={request.status} type="request" />
                            {escalation.shouldEscalate && (
                              <Badge variant="destructive" className="gap-1">
                                <Clock className="w-3 h-3" />
                                {escalation.daysPending}d
                              </Badge>
                            )}
                            {request.auditFlag && (
                              <Badge variant="outline" className="gap-1">
                                <Flag className="w-3 h-3" />
                                Audit
                              </Badge>
                            )}
                          </div>
                        </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dates:</span>
                            <span>
                              {format(new Date(request.startDate), "MMM dd")} -{" "}
                              {format(new Date(request.endDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Per Diem:</span>
                            <span className="font-medium">
                              FJD {request.perDiem.totalFJD.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost Centre:</span>
                            <span>{request.costCentre.code}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div>
          {selectedRequest ? (
            <Card>
              <CardHeader>
                <CardTitle>Review Request</CardTitle>
                <CardDescription>Request ID: {selectedRequest.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Employee Details</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{selectedRequest.employeeName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Employee #:</span>
                          <span>{selectedRequest.employeeNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Position:</span>
                          <span>{selectedRequest.position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Department:</span>
                          <span>{selectedRequest.department}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Travel Details</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Destination:</span>
                          <span>
                            {selectedRequest.destination.city},{" "}
                            {selectedRequest.destination.country}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{selectedRequest.perDiem.days} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dates:</span>
                          <span>
                            {format(new Date(selectedRequest.startDate), "MMM dd, yyyy")} -{" "}
                            {format(new Date(selectedRequest.endDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">Purpose:</span>
                        <p className="text-sm mt-1">{selectedRequest.purpose}</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Financial Details</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost Centre:</span>
                          <span>
                            {selectedRequest.costCentre.code} -{" "}
                            {selectedRequest.costCentre.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Funding Type:</span>
                          <span>
                            {selectedRequest.fundingType.charAt(0).toUpperCase() +
                              selectedRequest.fundingType.slice(1)}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold text-primary">
                          <span>Total Per Diem:</span>
                          <span>FJD {selectedRequest.perDiem.totalFJD.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <Separator />

                {!actionMode ? (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-[hsl(var(--coral))] text-[hsl(var(--coral))] hover:bg-[hsl(var(--coral))] hover:text-white"
                      onClick={() => setActionMode("reject")}
                      data-testid="button-start-reject"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-[hsl(var(--lagoon))] hover:bg-[hsl(var(--lagoon))]/90 text-white"
                      onClick={() => setActionMode("approve")}
                      data-testid="button-start-approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="comment">
                        Comment {actionMode === "reject" && "*"}
                      </Label>
                      <Textarea
                        id="comment"
                        placeholder={
                          actionMode === "approve"
                            ? "Optional approval comments..."
                            : "Please provide a reason for rejection..."
                        }
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-2"
                        data-testid="input-approval-comment"
                      />
                    </div>

                    {actionMode === "approve" && (
                      <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="auditFlag"
                            checked={auditFlag}
                            onCheckedChange={(checked) =>
                              setAuditFlag(checked as boolean)
                            }
                            data-testid="checkbox-audit-flag"
                          />
                          <Label htmlFor="auditFlag" className="cursor-pointer">
                            Flag for Audit
                          </Label>
                        </div>
                        {auditFlag && (
                          <Textarea
                            placeholder="Audit notes..."
                            value={auditNote}
                            onChange={(e) => setAuditNote(e.target.value)}
                            data-testid="input-audit-note"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button
                        className={`flex-1 ${actionMode === "approve" ? "bg-[hsl(var(--lagoon))] hover:bg-[hsl(var(--lagoon))]/90" : "bg-[hsl(var(--coral))] hover:bg-[hsl(var(--coral))]/90"} text-white`}
                        onClick={actionMode === "approve" ? handleApprove : handleReject}
                        disabled={
                          (actionMode === "reject" && !comment.trim()) ||
                          approveMutation.isPending ||
                          rejectMutation.isPending
                        }
                        data-testid="button-confirm-action"
                      >
                        {approveMutation.isPending || rejectMutation.isPending
                          ? "Processing..."
                          : `Confirm ${
                              actionMode === "approve" ? "Approval" : "Rejection"
                            }`}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Select a request to review
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
