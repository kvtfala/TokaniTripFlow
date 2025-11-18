import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Plane,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelRequest, RequestStatus } from "@shared/types";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [comment, setComment] = useState("");

  // Fetch request details
  const { data: request, isLoading } = useQuery<TravelRequest>({
    queryKey: ["/api/requests", id],
    enabled: !!id,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/requests/${id}/approve`, {
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: async () => {
      // Invalidate ALL queries matching this key (active + inactive)
      // This ensures ManagerDashboard will refetch when it mounts
      queryClient.invalidateQueries({ 
        queryKey: ["/api/requests"]
      });
      
      toast({
        title: "Vinaka! Request Approved",
        description: "The travel request has been approved and moved to the next step.",
      });
      
      // Navigate back - dashboard will auto-refetch due to invalidation
      setLocation("/dashboard/manager");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) {
        throw new Error("Comment required for rejection");
      }
      return apiRequest("POST", `/api/requests/${id}/reject`, {
        comment: comment.trim(),
      });
    },
    onSuccess: async () => {
      // Invalidate ALL queries matching this key (active + inactive)
      // This ensures ManagerDashboard will refetch when it mounts
      queryClient.invalidateQueries({ 
        queryKey: ["/api/requests"]
      });
      
      toast({
        title: "Request Rejected",
        description: "The travel request has been rejected.",
      });
      
      // Navigate back - dashboard will auto-refetch due to invalidation
      setLocation("/dashboard/manager");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading request details...
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            Request not found. The request ID may be invalid or you may not have permission to view it.
          </AlertDescription>
        </Alert>
        <Link href="/dashboard/manager">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<RequestStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      draft: { variant: "secondary", icon: Clock },
      submitted: { variant: "outline", icon: Clock },
      in_review: { variant: "default", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      ticketed: { variant: "default", icon: CheckCircle },
    };
    return variants[status];
  };

  const StatusIcon = getStatusBadge(request.status).icon;

  // Determine if current user can approve/reject
  const isPendingApproval = request.status === "submitted" || request.status === "in_review";
  const canTakeAction = isPendingApproval; // In production: check if current user is next approver

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manager">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Travel Request Details</h1>
          <p className="text-muted-foreground mt-1">Request ID: {request.id}</p>
        </div>
        <Badge {...getStatusBadge(request.status)} data-testid="badge-request-status">
          <StatusIcon className="w-4 h-4 mr-1" />
          {request.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Urgent alert */}
      {isPendingApproval && (() => {
        const daysUntil = Math.ceil(
          (new Date(request.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7) {
          return (
            <Alert variant="destructive">
              <AlertTriangle className="w-5 h-5" />
              <AlertDescription className="ml-2">
                <span className="font-semibold">URGENT:</span> Travel departure in {daysUntil} days - please review immediately
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

      {/* Out of policy alert */}
      {request.auditFlag && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">Out of Policy:</span> {request.auditNote}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Traveller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Traveller Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold text-lg">{request.employeeName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee Number</p>
                  <p className="font-medium">{request.employeeNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{request.position}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{request.department}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Purpose of Travel</p>
                <p className="font-medium">{request.purpose}</p>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-semibold text-lg">
                    {request.destination.city}, {request.destination.country}
                  </p>
                  <p className="text-sm text-muted-foreground">Airport: {request.destination.code}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Travel Dates</p>
                  <p className="font-medium">
                    {format(new Date(request.startDate), "MMMM dd, yyyy")} - {format(new Date(request.endDate), "MMMM dd, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {request.perDiem.days} days
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Flights Required</p>
                  <p className="font-medium">{request.needsFlights ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accommodation</p>
                  <p className="font-medium">{request.needsAccommodation ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Visa Required</p>
                  <Badge variant={request.visaCheck.status === "OK" ? "default" : "destructive"}>
                    {request.visaCheck.message}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ground Transport</p>
                  <p className="font-medium">{request.needsTransport ? "Yes" : "No"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cost Centre</p>
                  <p className="font-medium">{request.costCentre.code}</p>
                  <p className="text-xs text-muted-foreground">{request.costCentre.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Funding Type</p>
                  <p className="font-medium capitalize">{request.fundingType}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-semibold mb-2">Per Diem Calculation</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily MIE Rate:</span>
                    <span className="font-medium">FJD {request.perDiem.mieFJD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First Day (75%):</span>
                    <span className="font-medium">FJD {request.perDiem.firstDayFJD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Middle Days ({request.perDiem.days - 2} days):</span>
                    <span className="font-medium">FJD {request.perDiem.middleDaysFJD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Day (75%):</span>
                    <span className="font-medium">FJD {request.perDiem.lastDayFJD.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Per Diem:</span>
                    <span className="text-primary">FJD {request.perDiem.totalFJD.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column on large screens */}
        <div className="space-y-6">
          {/* Approval Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Approval Timeline
              </CardTitle>
              <CardDescription>
                {isPendingApproval ? "Current approval progress" : "Completed approval flow"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.history.map((entry, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${
                        entry.action === "APPROVE" ? "bg-green-600" : 
                        entry.action === "REJECT" ? "bg-red-600" : 
                        "bg-blue-600"
                      }`} />
                      {index < request.history.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">
                        by {entry.actor}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.ts), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                      {entry.note && (
                        <p className="text-sm mt-1">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Decision Section (for managers) */}
          {canTakeAction && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Make Decision</CardTitle>
                <CardDescription>
                  Approve or reject this travel request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Comments {!comment.trim() && "(optional for approval, required for rejection)"}
                  </label>
                  <Textarea
                    placeholder="Add any comments or justification..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    data-testid="textarea-decision-comment"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="w-full"
                    data-testid="button-approve"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Approve Request
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => rejectMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending || !comment.trim()}
                    className="w-full"
                    data-testid="button-reject"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous review (if exists) */}
          {request.reviewedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Previous Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed By</p>
                  <p className="font-medium">{request.reviewedBy}</p>
                </div>
                {request.reviewedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed On</p>
                    <p className="text-sm">{format(new Date(request.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {request.reviewComment && (
                  <div>
                    <p className="text-sm text-muted-foreground">Comment</p>
                    <p className="text-sm">{request.reviewComment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
