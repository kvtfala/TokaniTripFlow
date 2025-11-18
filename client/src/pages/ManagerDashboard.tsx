import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Calendar,
  MapPin,
  User,
  TrendingUp,
  DollarSign,
  ShieldAlert
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { TravelRequest } from "@shared/types";
import { useRole } from "@/contexts/RoleContext";

export default function ManagerDashboard() {
  const { role } = useRole();
  
  // TODO: Production - Add proper authentication and authorization
  // For demo: Simple role check against mock RoleContext
  if (role !== "manager") {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <ShieldAlert className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <strong>Access Denied:</strong> This page is only accessible to managers. 
            Your current role is "{role}".
          </AlertDescription>
        </Alert>
        <Link href="/">
          <Button className="mt-4">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }
  // Fetch all requests
  const { data: allRequests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Filter pending approvals (where THIS manager is the current/next approver)
  // In production: replace with actual logged-in manager ID from auth
  const currentManagerId = "manager";
  const pendingApprovals = allRequests.filter(req => 
    (req.status === "submitted" || req.status === "in_review") &&
    req.approverIndex < req.approverFlow.length &&
    req.approverFlow[req.approverIndex] === currentManagerId
  );

  // Urgent requests (departure within 14 days)
  const urgentApprovals = pendingApprovals.filter(req => {
    const daysUntilDeparture = Math.ceil(
      (new Date(req.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDeparture <= 14;
  });

  // Out-of-policy requests needing attention
  const outOfPolicyRequests = pendingApprovals.filter(req => 
    req.auditFlag === true
  );

  // Recently approved by this manager (last 7 days)
  const recentlyApproved = allRequests.filter(req => {
    const reviewDate = req.reviewedAt ? new Date(req.reviewedAt) : null;
    if (!reviewDate) return false;
    const daysAgo = Math.ceil((new Date().getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    return req.status === "approved" && daysAgo <= 7;
  });

  // Stats
  const stats = {
    pendingCount: pendingApprovals.length,
    urgentCount: urgentApprovals.length,
    outOfPolicyCount: outOfPolicyRequests.length,
    approvedThisWeek: recentlyApproved.length,
  };

  const getDaysUntilDeparture = (startDate: string) => {
    const days = Math.ceil(
      (new Date(startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 3) return { variant: "destructive" as const, label: "URGENT" };
    if (days <= 7) return { variant: "default" as const, label: "High Priority" };
    if (days <= 14) return { variant: "outline" as const, label: "Medium" };
    return null;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bula! Manager Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve travel requests from your team
        </p>
      </div>

      {/* Alert for urgent items */}
      {urgentApprovals.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">{urgentApprovals.length}</span> urgent approval{urgentApprovals.length > 1 ? 's' : ''} require your immediate attention (departure within 14 days)
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-3xl font-bold" data-testid="stat-pending">{stats.pendingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-3xl font-bold" data-testid="stat-urgent">{stats.urgentCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="text-3xl font-bold" data-testid="stat-out-of-policy">{stats.outOfPolicyCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-3xl font-bold" data-testid="stat-approved-week">{stats.approvedThisWeek}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Travel requests awaiting your review and decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading approvals...
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-semibold">All caught up!</p>
              <p className="text-sm text-muted-foreground">No pending approvals at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((request) => {
                const daysUntil = getDaysUntilDeparture(request.startDate);
                const urgencyBadge = getUrgencyBadge(daysUntil);
                
                return (
                  <Card 
                    key={request.id} 
                    className={`hover-elevate ${urgencyBadge?.variant === "destructive" ? "border-red-500" : ""}`}
                    data-testid={`approval-card-${request.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Request details */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{request.employeeName}</h3>
                                {urgencyBadge && (
                                  <Badge variant={urgencyBadge.variant}>
                                    {urgencyBadge.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {request.position} · {request.department}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline">
                                {request.status === "submitted" ? "New Request" : "In Review"}
                              </Badge>
                              {request.auditFlag && (
                                <Badge variant="destructive">Out of Policy</Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{request.destination.city}, {request.destination.country}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {format(new Date(request.startDate), "MMM dd")} - {format(new Date(request.endDate), "MMM dd, yyyy")}
                              </span>
                              <span className={`ml-2 text-xs font-semibold ${daysUntil <= 7 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                ({daysUntil} days)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Submitted {formatDistanceToNow(new Date(request.submittedAt))} ago</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span>FJD {request.perDiem.totalFJD.toFixed(2)} per diem</span>
                            </div>
                          </div>

                          <p className="text-sm">
                            <span className="font-medium">Purpose:</span> {request.purpose}
                          </p>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex md:flex-col gap-2 w-full md:w-auto">
                          <Link href={`/requests/${request.id}`} className="flex-1 md:flex-initial">
                            <Button variant="default" size="lg" className="w-full" data-testid={`button-review-${request.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Review & Decide
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Approved */}
      {recentlyApproved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Approved</CardTitle>
            <CardDescription>Requests you approved in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentlyApproved.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                  data-testid={`recent-approval-${request.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{request.employeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.destination.city} · {format(new Date(request.startDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <Link href={`/requests/${request.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
