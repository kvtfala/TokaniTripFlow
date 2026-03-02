import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Plane,
  ChevronRight,
  FileText,
  BarChart2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import type { TravelRequest } from "@shared/types";
import { useRole } from "@/contexts/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";

export default function Home() {
  const { currentUser, isLoading } = useRole();

  const { data: requests = [], isLoading: requestsLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const getGreetingName = () => {
    if (!currentUser) return "there";
    if (currentUser.firstName) return currentUser.firstName;
    if (currentUser.email) return currentUser.email.split("@")[0];
    return "there";
  };

  const roleSubtitle: Record<string, string> = {
    employee: "Here's your travel overview",
    coordinator: "Manage your team's travel requests",
    manager: "Review and approve travel requests",
    finance_admin: "Monitor travel budgets and expenses",
    travel_admin: "Process approved travel bookings",
    super_admin: "System-wide travel management",
  };

  const role = currentUser?.role || "employee";

  // --- Computed stats ---
  const myRequests = requests.filter(r => r.employeeId === currentUser?.id);
  const pendingApproval = requests.filter(r => r.status === "submitted" || r.status === "in_review");
  const awaitingQuotes = requests.filter(r => r.status === "awaiting_quotes");
  const quotesReady = requests.filter(r => r.status === "quotes_submitted");
  const approved = requests.filter(r => r.status === "approved" || r.status === "ticketed");
  const rejected = requests.filter(r => r.status === "rejected");

  const isManagerRole = role === "manager" || role === "super_admin";
  const needsAttentionCount = isManagerRole
    ? pendingApproval.length + quotesReady.length
    : 0;

  // Recent requests — last 5 across all, or just mine for employees
  const relevantRequests = role === "employee" ? myRequests : requests;
  const recentRequests = [...relevantRequests]
    .sort((a, b) => new Date(b.submittedAt || "").getTime() - new Date(a.submittedAt || "").getTime())
    .slice(0, 5);

  // --- Role-aware stat cards ---
  const statCards = (() => {
    if (role === "employee") {
      return [
        { label: "My Requests", value: myRequests.length, href: "/my-trips", color: "" },
        { label: "Pending", value: myRequests.filter(r => r.status === "submitted" || r.status === "in_review").length, href: "/my-trips", color: "text-amber-600 dark:text-amber-400" },
        { label: "Approved", value: myRequests.filter(r => r.status === "approved" || r.status === "ticketed").length, href: "/my-trips", color: "text-green-600 dark:text-green-400" },
        { label: "Rejected", value: myRequests.filter(r => r.status === "rejected").length, href: "/my-trips", color: "text-destructive" },
      ];
    }
    if (role === "travel_desk") {
      return [
        { label: "Total", value: requests.length, href: "/my-trips", color: "" },
        { label: "Approved & Ready", value: approved.length, href: "/dashboard/travel-desk", color: "text-green-600 dark:text-green-400" },
        { label: "Pending Approval", value: pendingApproval.length, href: "/approvals", color: "text-amber-600 dark:text-amber-400" },
        { label: "Rejected", value: rejected.length, href: "/my-trips", color: "text-destructive" },
      ];
    }
    // manager, super_admin, coordinator, finance_admin
    return [
      { label: "Total Requests", value: requests.length, href: "/my-trips", color: "" },
      { label: "Needs Approval", value: pendingApproval.length + quotesReady.length, href: "/approvals", color: pendingApproval.length + quotesReady.length > 0 ? "text-amber-600 dark:text-amber-400" : "" },
      { label: "Awaiting Quotes", value: awaitingQuotes.length, href: "/approvals", color: "" },
      { label: "Approved", value: approved.length, href: "/my-trips", color: "text-green-600 dark:text-green-400" },
    ];
  })();

  // --- Role-aware quick nav tiles ---
  const navTiles = (() => {
    const tiles = [];
    if (isManagerRole || role === "coordinator") {
      tiles.push({
        label: "Approvals Queue",
        description: `${pendingApproval.length + quotesReady.length} need attention`,
        href: "/approvals",
        icon: CheckCircle,
        highlight: (pendingApproval.length + quotesReady.length) > 0,
      });
    }
    if (role === "travel_desk") {
      tiles.push({
        label: "Booking Queue",
        description: `${approved.length} ready to book`,
        href: "/dashboard/travel-desk",
        icon: Plane,
        highlight: approved.length > 0,
      });
    }
    tiles.push({
      label: "My Trips",
      description: role === "employee" ? `${myRequests.length} request${myRequests.length !== 1 ? "s" : ""}` : "View all requests",
      href: "/my-trips",
      icon: Calendar,
      highlight: false,
    });
    if (role !== "employee") {
      tiles.push({
        label: "Travel Watch",
        description: "KPIs & alerts",
        href: "/travel-watch",
        icon: BarChart2,
        highlight: false,
      });
    }
    if (isManagerRole) {
      tiles.push({
        label: "Analytics",
        description: "Trends & reports",
        href: "/analytics",
        icon: TrendingUp,
        highlight: false,
      });
    }
    tiles.push({
      label: "New Request",
      description: "Submit travel request",
      href: "/request/new",
      icon: Plus,
      highlight: false,
    });
    return tiles;
  })();

  if (isLoading || requestsLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-home">
            Bula, {getGreetingName()}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {roleSubtitle[role] || "Your trusted partner for travel approvals"}
          </p>
        </div>
        <Link href="/request/new">
          <Button data-testid="button-new-request">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* ── Needs attention banner ── */}
      {needsAttentionCount > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800" data-testid="banner-needs-attention">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                {needsAttentionCount} request{needsAttentionCount !== 1 ? "s" : ""} need your attention
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {pendingApproval.length > 0 && `${pendingApproval.length} pending pre-approval`}
                {pendingApproval.length > 0 && quotesReady.length > 0 && " · "}
                {quotesReady.length > 0 && `${quotesReady.length} ready for final approval`}
              </p>
            </div>
          </div>
          <Link href="/approvals">
            <Button variant="outline" size="sm" data-testid="button-review-approvals">
              Review
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover-elevate cursor-pointer h-full" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Main body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Activity — 2/3 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link href="/my-trips">
                <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-view-all-activity">
                  View all
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {recentRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No travel requests yet</p>
                  <Link href="/request/new">
                    <Button variant="outline" size="sm" className="mt-3">
                      Create your first request
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  {recentRequests.map((request, i) => (
                    <Link key={request.id} href={`/requests/${request.id}`}>
                      <div
                        className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < recentRequests.length - 1 ? "border-b" : ""}`}
                        data-testid={`row-request-${request.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{request.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 inline mr-0.5" />
                            {request.destination.city}, {request.destination.country}
                            &nbsp;·&nbsp;
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {format(new Date(request.startDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={request.status} id={request.id} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation — 1/3 */}
        <div className="space-y-2">
          {navTiles.map((tile) => (
            <Link key={tile.href} href={tile.href}>
              <div
                className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer bg-card"
                data-testid={`nav-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`p-2 rounded-md shrink-0 ${tile.highlight ? "bg-amber-100 dark:bg-amber-900" : "bg-muted"}`}>
                  <tile.icon className={`w-4 h-4 ${tile.highlight ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tile.label}</p>
                  <p className="text-xs text-muted-foreground">{tile.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
