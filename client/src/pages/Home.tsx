import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  CheckCircle,
  Calendar,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Plane,
  ChevronRight,
  FileText,
  BarChart2,
  ArrowRight,
  Clock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
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
  const isManagerRole = role === "manager" || role === "super_admin";

  // --- Computed buckets ---
  const myRequests = requests.filter(r => r.employeeId === currentUser?.id);
  const submitted = requests.filter(r => r.status === "submitted" || r.status === "in_review");
  const awaitingQuotes = requests.filter(r => r.status === "awaiting_quotes");
  const quotesReady = requests.filter(r => r.status === "quotes_submitted");
  const fullyApproved = requests.filter(r => r.status === "approved" || r.status === "ticketed");
  const rejected = requests.filter(r => r.status === "rejected");

  const needsAttentionCount = isManagerRole ? submitted.length + quotesReady.length : 0;

  // Upcoming departures — approved/ticketed trips in the next 30 days
  const today = new Date();
  const upcomingDepartures = fullyApproved
    .filter(r => {
      const days = differenceInDays(new Date(r.startDate), today);
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  // Longest-waiting — submitted requests sorted by submission date ascending (oldest first)
  const overdueSubmitted = [...submitted]
    .sort((a, b) => new Date(a.submittedAt || "").getTime() - new Date(b.submittedAt || "").getTime())
    .slice(0, 3);

  // Recent requests for activity feed
  const relevantRequests = role === "employee" ? myRequests : requests;
  const recentRequests = [...relevantRequests]
    .sort((a, b) => new Date(b.submittedAt || "").getTime() - new Date(a.submittedAt || "").getTime())
    .slice(0, 5);

  // --- Workflow pipeline stages ---
  const pipelineStages = [
    { label: "Needs Pre-Approval", count: submitted.length, href: "/approvals", color: submitted.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground", dotColor: "bg-amber-400" },
    { label: "Awaiting Quotes", count: awaitingQuotes.length, href: "/approvals", color: "text-muted-foreground", dotColor: "bg-blue-400" },
    { label: "Quotes Ready", count: quotesReady.length, href: "/approvals", color: quotesReady.length > 0 ? "text-primary" : "text-muted-foreground", dotColor: "bg-primary" },
    { label: "Approved", count: fullyApproved.length, href: "/my-trips", color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500" },
    { label: "Rejected", count: rejected.length, href: "/my-trips", color: "text-muted-foreground", dotColor: "bg-destructive" },
  ];

  // Employee pipeline — just their own requests
  const myPipeline = [
    { label: "Draft", count: myRequests.filter(r => r.status === "draft").length, href: "/my-trips", color: "text-muted-foreground", dotColor: "bg-muted-foreground" },
    { label: "In Review", count: myRequests.filter(r => r.status === "submitted" || r.status === "in_review").length, href: "/my-trips", color: "text-amber-600 dark:text-amber-400", dotColor: "bg-amber-400" },
    { label: "Awaiting Quotes", count: myRequests.filter(r => r.status === "awaiting_quotes").length, href: "/my-trips", color: "text-muted-foreground", dotColor: "bg-blue-400" },
    { label: "Approved", count: myRequests.filter(r => r.status === "approved" || r.status === "ticketed").length, href: "/my-trips", color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500" },
  ];

  const activePipeline = role === "employee" ? myPipeline : pipelineStages;

  // --- Quick nav tiles ---
  const navTiles = (() => {
    const tiles = [];
    if (isManagerRole || role === "coordinator") {
      tiles.push({ label: "Approvals Queue", description: `${submitted.length + quotesReady.length} need attention`, href: "/approvals", icon: CheckCircle, highlight: (submitted.length + quotesReady.length) > 0 });
    }
    if (role === "travel_desk") {
      tiles.push({ label: "Booking Queue", description: `${fullyApproved.length} ready to book`, href: "/dashboard/travel-desk", icon: Plane, highlight: fullyApproved.length > 0 });
    }
    tiles.push({ label: "My Trips", description: role === "employee" ? `${myRequests.length} request${myRequests.length !== 1 ? "s" : ""}` : "All requests", href: "/my-trips", icon: Calendar, highlight: false });
    if (role !== "employee") {
      tiles.push({ label: "Travel Watch", description: "KPIs & alerts", href: "/travel-watch", icon: BarChart2, highlight: false });
    }
    if (isManagerRole) {
      tiles.push({ label: "Reports", description: "Analytics & export", href: "/reports", icon: TrendingUp, highlight: false });
    }
    tiles.push({ label: "New Request", description: "Submit travel request", href: "/request/new", icon: Plus, highlight: false });
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
                {submitted.length > 0 && `${submitted.length} pending pre-approval`}
                {submitted.length > 0 && quotesReady.length > 0 && " · "}
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

      {/* ── Workflow Pipeline ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {role === "employee" ? "My Request Pipeline" : "Request Pipeline"}
          </CardTitle>
          <Link href={role === "employee" ? "/my-trips" : "/approvals"}>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto py-1">
              Details <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-0 overflow-x-auto">
            {activePipeline.map((stage, i) => (
              <Link key={stage.label} href={stage.href} className="flex items-center flex-1 min-w-0">
                <div className="flex-1 min-w-0 text-center px-2 py-1" data-testid={`pipeline-${stage.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${stage.dotColor}`} />
                    <span className="text-xs text-muted-foreground truncate">{stage.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${stage.color}`}>{stage.count}</p>
                </div>
                {i < activePipeline.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-border shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Activity + Upcoming ── 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Upcoming Departures — shown when relevant */}
          {upcomingDepartures.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="w-4 h-4 text-primary" />
                  Upcoming Departures
                </CardTitle>
                <span className="text-xs text-muted-foreground">Next 30 days</span>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div>
                  {upcomingDepartures.map((r, i) => {
                    const daysAway = differenceInDays(new Date(r.startDate), today);
                    return (
                      <Link key={r.id} href={`/requests/${r.id}`}>
                        <div className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < upcomingDepartures.length - 1 ? "border-b" : ""}`} data-testid={`departure-${r.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {r.destination.city}, {r.destination.country}
                              &nbsp;·&nbsp;
                              {format(new Date(r.startDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge variant={daysAway <= 3 ? "destructive" : daysAway <= 7 ? "outline" : "secondary"} className="text-xs">
                              {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway} days`}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link href="/my-trips">
                <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-view-all-activity">
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {recentRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No travel requests yet</p>
                  <Link href="/request/new">
                    <Button variant="outline" size="sm" className="mt-3">Create your first request</Button>
                  </Link>
                </div>
              ) : (
                <div>
                  {recentRequests.map((r, i) => (
                    <Link key={r.id} href={`/requests/${r.id}`}>
                      <div className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < recentRequests.length - 1 ? "border-b" : ""}`} data-testid={`row-request-${r.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 inline mr-0.5" />
                            {r.destination.city}, {r.destination.country}
                            &nbsp;·&nbsp;
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {format(new Date(r.startDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <StatusBadge status={r.status} id={r.id} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Longest-waiting for managers — oldest pending requests */}
          {isManagerRole && overdueSubmitted.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Waiting Longest
                </CardTitle>
                <span className="text-xs text-muted-foreground">Oldest pending requests</span>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div>
                  {overdueSubmitted.map((r, i) => {
                    const waitDays = r.submittedAt ? differenceInDays(today, new Date(r.submittedAt)) : 0;
                    return (
                      <Link key={r.id} href={`/requests/${r.id}`}>
                        <div className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < overdueSubmitted.length - 1 ? "border-b" : ""}`} data-testid={`overdue-${r.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {r.destination.city}, {r.destination.country}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge variant={waitDays >= 5 ? "destructive" : "outline"} className="text-xs">
                              {waitDays === 0 ? "Today" : `${waitDays}d waiting`}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Quick Navigation ── 1/3 */}
        <div className="space-y-2">
          {navTiles.map((tile) => (
            <Link key={tile.href} href={tile.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer bg-card" data-testid={`tile-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}>
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
