import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Clock, AlertTriangle, Flag } from "lucide-react";
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
  const { toast } = useToast();

  // Mock current user - in production this would come from auth
  const currentUserId = "manager";

  const { data: requests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/approve`, { comment, auditFlag, auditNote });
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
  const pendingRequests = requests.filter(
    (req) =>
      (req.status === "submitted" || req.status === "in_review") &&
      nextApprover(req) === currentUserId
  );

  const escalationWarnings = pendingRequests
    .map((req) => checkRequestForEscalation(req))
    .filter((check) => check.shouldEscalate);

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
          <h2 className="text-xl font-semibold mb-4">
            Pending Approvals ({pendingRequests.length})
          </h2>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No pending approvals
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
                      }`}
                      onClick={() => setSelectedRequest(request)}
                      data-testid={`card-request-${request.id}`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
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
