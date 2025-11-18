import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plane
} from "lucide-react";
import { format } from "date-fns";
import type { TravelRequest } from "@shared/types";
import { useRole } from "@/contexts/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { TokaniLogo } from "@/components/brand/TokaniLogo";

export default function Home() {
  const { currentUser, isLoading } = useRole();
  
  // Fetch all requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Role-aware stats
  const getStats = () => {
    const base = {
      total: requests.length,
      pending: requests.filter(r => r.status === "submitted" || r.status === "in_review").length,
      approved: requests.filter(r => r.status === "approved").length,
      rejected: requests.filter(r => r.status === "rejected").length,
    };

    if (currentUser.role === "employee") {
      // Show personal stats
      const myRequests = requests.filter(r => r.employeeId === currentUser.id);
      return {
        ...base,
        myTotal: myRequests.length,
        myPending: myRequests.filter(r => r.status === "submitted" || r.status === "in_review").length,
      };
    }

    if (currentUser.role === "manager") {
      const needsApproval = requests.filter(r => 
        (r.status === "submitted" || r.status === "in_review")
      ).length;
      return { ...base, needsApproval };
    }

    if (currentUser.role === "travel_desk") {
      const readyForTicketing = requests.filter(r => r.status === "approved").length;
      return { ...base, readyForTicketing };
    }

    return base;
  };

  const stats = getStats();

  // Role-aware greeting
  const getGreeting = () => {
    const firstName = currentUser.name.split(" ")[0];
    const roleGreetings: Record<string, string> = {
      employee: `Here's your travel overview`,
      coordinator: `Manage your team's travel requests`,
      manager: `Review and approve travel requests`,
      finance: `Monitor travel budgets and expenses`,
      travel_desk: `Process approved travel bookings`,
    };
    return {
      title: `Bula, ${firstName}!`,
      subtitle: roleGreetings[currentUser.role] || "Your trusted partner for travel approvals",
    };
  };

  const greeting = getGreeting();

  // Recent activity - show most recent 3 requests
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.submittedAt || "").getTime() - new Date(a.submittedAt || "").getTime())
    .slice(0, 3);

  // Role-aware quick actions
  const getQuickActions = () => {
    const actions = [
      { label: "New Travel Request", href: "/request/new", icon: Plus, variant: "secondary" as const, show: true },
      { label: "My Trips", href: "/my-trips", icon: Calendar, variant: "outline" as const, show: true },
    ];

    if (currentUser.role === "coordinator") {
      actions.push({ label: "View All Requests", href: "/dashboard/coordinator", icon: Eye, variant: "outline" as const, show: true });
    }

    if (currentUser.role === "manager") {
      actions.push({ label: "Approvals Queue", href: "/dashboard/manager", icon: CheckCircle, variant: "outline" as const, show: true });
    }

    if (currentUser.role === "travel_desk") {
      actions.push({ label: "Travel Desk", href: "/dashboard/travel-desk", icon: Plane, variant: "outline" as const, show: true });
    }

    actions.push({ label: "Travel Watch", href: "/travel-watch", icon: MapPin, variant: "outline" as const, show: currentUser.role !== "employee" });

    return actions.filter(a => a.show);
  };

  const quickActions = getQuickActions();

  if (isLoading || requestsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your overview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Logo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="hidden md:block">
            <TokaniLogo variant="icon" className="h-16 w-16" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-home">
              {greeting.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {greeting.subtitle}
            </p>
          </div>
        </div>
        <Link href="/request/new">
          <Button size="lg" variant="secondary" data-testid="button-new-request">
            <Plus className="w-5 h-5 mr-2" />
            New Travel Request
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {currentUser.role === "employee" ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">My Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-my-total">{'myTotal' in stats ? stats.myTotal : 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span className="text-3xl font-bold" data-testid="stat-my-pending">{'myPending' in stats ? stats.myPending : 0}</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-total">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {currentUser.role === "manager" ? "Needs Approval" : "Pending"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span className="text-3xl font-bold" data-testid="stat-pending">
                    {currentUser.role === "manager" && 'needsApproval' in stats ? stats.needsApproval : stats.pending}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-3xl font-bold" data-testid="stat-approved">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {currentUser.role === "travel_desk" ? "Ready to Book" : "Rejected"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {currentUser.role === "travel_desk" ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className="text-3xl font-bold" data-testid="stat-rejected">
                {currentUser.role === "travel_desk" && 'readyForTicketing' in stats ? stats.readyForTicketing : stats.rejected}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button variant={action.variant} size="lg" data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No travel requests yet</p>
                <Link href="/request/new">
                  <Button variant="outline" size="sm" className="mt-3">
                    Create your first request
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <Link key={request.id} href={`/requests/${request.id}`}>
                    <div className="p-4 border rounded-lg hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-request-${request.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{request.employeeName}</h3>
                            <StatusBadge status={request.status} id={request.id} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {request.destination.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(request.startDate), "MMM d")}
                            </span>
                            {request.perDiem?.totalFJD && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                FJD {request.perDiem.totalFJD.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-specific panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              {currentUser.role === "manager" ? "Action Required" : 
               currentUser.role === "travel_desk" ? "Booking Queue" :
               currentUser.role === "coordinator" ? "Team Overview" :
               "Your Travel Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentUser.role === "manager" && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {'needsApproval' in stats ? stats.needsApproval : 0} request{('needsApproval' in stats ? stats.needsApproval : 0) !== 1 ? 's' : ''} awaiting your approval
                      </p>
                      <Link href="/dashboard/manager">
                        <Button variant="ghost" size="sm" className="px-0 h-auto text-warning hover:text-warning/80">
                          Review now →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {currentUser.role === "travel_desk" && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Plane className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {'readyForTicketing' in stats ? stats.readyForTicketing : 0} request{('readyForTicketing' in stats ? stats.readyForTicketing : 0) !== 1 ? 's' : ''} ready for booking
                      </p>
                      <Link href="/dashboard/travel-desk">
                        <Button variant="ghost" size="sm" className="px-0 h-auto text-success hover:text-success/80">
                          Process bookings →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {currentUser.role === "coordinator" && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        Managing {stats.total} total travel request{stats.total !== 1 ? 's' : ''}
                      </p>
                      <Link href="/dashboard/coordinator">
                        <Button variant="ghost" size="sm" className="px-0 h-auto text-primary hover:text-primary/80">
                          View all requests →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {currentUser.role === "employee" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Track your travel requests and plan upcoming trips
                  </p>
                  <Link href="/my-trips">
                    <Button variant="outline" size="sm" className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      View My Trips
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
