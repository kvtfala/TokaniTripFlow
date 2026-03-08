import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  CheckCircle,
  Calendar,
  MapPin,
  AlertTriangle,
  PlaneTakeoff,
  PlaneLanding,
  ChevronRight,
  FileText,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Users,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { format, differenceInDays, isThisMonth } from "date-fns";
import type { TravelRequest } from "@shared/types";
import { useRole } from "@/contexts/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { currentUser, isLoading } = useRole();
  const { data: requests = [], isLoading: requestsLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const role = currentUser?.role || "employee";
  const isManagerRole = ["manager", "super_admin", "coordinator"].includes(role);
  const isFinanceRole = role === "finance_admin";
  const today = new Date();

  const greetingName = !currentUser ? "there"
    : currentUser.firstName || currentUser.email?.split("@")[0] || "there";

  // ── Data buckets ─────────────────────────────────────────────────────────
  const myRequests = requests.filter(r => r.employeeId === currentUser?.id);
  const submitted = requests.filter(r => ["submitted", "in_review"].includes(r.status));
  const awaitingQuotes = requests.filter(r => r.status === "awaiting_quotes");
  const quotesReady = requests.filter(r => r.status === "quotes_submitted");
  const fullyApproved = requests.filter(r => ["approved", "ticketed"].includes(r.status));
  const rejected = requests.filter(r => r.status === "rejected");

  const currentlyAway = requests.filter(r => {
    if (!["approved", "ticketed"].includes(r.status)) return false;
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    return start <= today && today <= end;
  });

  const approvedThisMonth = requests.filter(r =>
    ["approved", "ticketed"].includes(r.status) && isThisMonth(new Date(r.submittedAt || ""))
  );

  const needsAttentionCount = isManagerRole ? submitted.length + quotesReady.length : 0;

  const upcomingDepartures = fullyApproved
    .filter(r => { const d = differenceInDays(new Date(r.startDate), today); return d >= 0 && d <= 30; })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  const myUpcoming = myRequests.filter(r => {
    if (!["approved", "ticketed"].includes(r.status)) return false;
    const d = differenceInDays(new Date(r.startDate), today);
    return d >= 0 && d <= 30;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const overdueSubmitted = [...submitted]
    .sort((a, b) => new Date(a.submittedAt || "").getTime() - new Date(b.submittedAt || "").getTime())
    .slice(0, 3);

  const relevantRequests = role === "employee" ? myRequests : requests;
  const recentRequests = [...relevantRequests]
    .sort((a, b) => new Date(b.submittedAt || "").getTime() - new Date(a.submittedAt || "").getTime())
    .slice(0, 5);

  // ── Dynamic subtitle ──────────────────────────────────────────────────────
  const dynamicSubtitle = (() => {
    if (isManagerRole) {
      if (needsAttentionCount > 0)
        return `${needsAttentionCount} request${needsAttentionCount !== 1 ? "s" : ""} need${needsAttentionCount === 1 ? "s" : ""} your review`;
      if (currentlyAway.length > 0)
        return `${currentlyAway.length} traveller${currentlyAway.length !== 1 ? "s" : ""} currently away`;
      return "All clear — no pending approvals";
    }
    if (isFinanceRole) return `${approvedThisMonth.length} trips approved this month`;
    if (role === "employee") {
      if (myUpcoming.length > 0) {
        const next = myUpcoming[0];
        const days = differenceInDays(new Date(next.startDate), today);
        if (days === 0) return `You depart today to ${next.destination.city}`;
        if (days === 1) return `You depart tomorrow to ${next.destination.city}`;
        return `Your next trip is in ${days} days — ${next.destination.city}`;
      }
      const inReview = myRequests.filter(r => ["submitted", "in_review"].includes(r.status));
      if (inReview.length > 0) return "Your request is under review";
      return "Here's your travel overview";
    }
    return "System-wide travel management";
  })();

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const pipelineStages = [
    { label: "Needs Pre-Approval", count: submitted.length, href: "/approvals", color: submitted.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground", dotColor: "bg-amber-400" },
    { label: "Awaiting Quotes", count: awaitingQuotes.length, href: "/approvals", color: "text-muted-foreground", dotColor: "bg-blue-400" },
    { label: "Quotes Ready", count: quotesReady.length, href: "/approvals", color: quotesReady.length > 0 ? "text-primary" : "text-muted-foreground", dotColor: "bg-primary" },
    { label: "Approved", count: fullyApproved.length, href: "/my-trips", color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500" },
    { label: "Rejected", count: rejected.length, href: "/my-trips", color: "text-muted-foreground", dotColor: "bg-destructive" },
  ];

  const myPipeline = [
    { label: "Draft", count: myRequests.filter(r => r.status === "draft").length, href: "/my-trips", color: "text-muted-foreground", dotColor: "bg-muted-foreground" },
    { label: "In Review", count: myRequests.filter(r => ["submitted", "in_review"].includes(r.status)).length, href: "/my-trips", color: "text-amber-600 dark:text-amber-400", dotColor: "bg-amber-400" },
    { label: "Awaiting Quotes", count: myRequests.filter(r => r.status === "awaiting_quotes").length, href: "/my-trips", color: "text-muted-foreground", dotColor: "bg-blue-400" },
    { label: "Approved", count: myRequests.filter(r => ["approved", "ticketed"].includes(r.status)).length, href: "/my-trips", color: "text-green-600 dark:text-green-400", dotColor: "bg-green-500" },
  ];

  const activePipeline = role === "employee" ? myPipeline : pipelineStages;

  // ── KPI cards ─────────────────────────────────────────────────────────────
  type KpiCard = {
    label: string; value: number | string; sub: string;
    Icon: React.FC<{ className?: string }>;
    accentClass: string; href: string; pulse?: boolean; testId: string;
  };

  const uniqueCountries = (arr: TravelRequest[]) =>
    [...new Set(arr.map(r => r.destination.country))].length;

  const kpiCards: KpiCard[] = (() => {
    if (isManagerRole) {
      return [
        {
          label: "Needs Review", value: needsAttentionCount,
          sub: needsAttentionCount > 0 ? `${submitted.length} pending · ${quotesReady.length} quotes ready` : "No pending approvals",
          Icon: Inbox,
          accentClass: needsAttentionCount > 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground",
          href: "/approvals", pulse: needsAttentionCount > 0, testId: "kpi-needs-review",
        },
        {
          label: "Quotes Ready", value: quotesReady.length,
          sub: quotesReady.length > 0 ? "Awaiting final approval" : "No quotes pending",
          Icon: CheckCircle,
          accentClass: quotesReady.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          href: "/approvals", pulse: quotesReady.length > 0, testId: "kpi-quotes-ready",
        },
        {
          label: "Away Now", value: currentlyAway.length,
          sub: currentlyAway.length > 0 ? `in ${uniqueCountries(currentlyAway)} countr${uniqueCountries(currentlyAway) !== 1 ? "ies" : "y"}` : "No one currently travelling",
          Icon: Users,
          accentClass: currentlyAway.length > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground",
          href: "/travel-watch", testId: "kpi-away-now",
        },
        {
          label: "Approved This Month", value: approvedThisMonth.length,
          sub: `${fullyApproved.length} total approved`,
          Icon: TrendingUp,
          accentClass: "bg-primary/10 text-primary",
          href: "/reports", testId: "kpi-approved-month",
        },
      ];
    }

    if (isFinanceRole) {
      return [
        {
          label: "Away Now", value: currentlyAway.length,
          sub: currentlyAway.length > 0 ? `in ${uniqueCountries(currentlyAway)} countries` : "No one travelling",
          Icon: Users,
          accentClass: currentlyAway.length > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground",
          href: "/travel-watch", testId: "kpi-away-now",
        },
        {
          label: "Approved This Month", value: approvedThisMonth.length,
          sub: "Approved or ticketed trips",
          Icon: TrendingUp, accentClass: "bg-primary/10 text-primary",
          href: "/reports", testId: "kpi-approved-month",
        },
        {
          label: "Quotes Ready", value: quotesReady.length,
          sub: "Awaiting final approval",
          Icon: CheckCircle,
          accentClass: quotesReady.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          href: "/approvals", testId: "kpi-quotes-ready",
        },
        {
          label: "Total Requests", value: requests.length,
          sub: `${rejected.length} rejected`,
          Icon: FileText, accentClass: "bg-muted text-muted-foreground",
          href: "/reports", testId: "kpi-total-requests",
        },
      ];
    }

    // Employee
    const myInReview = myRequests.filter(r => ["submitted", "in_review"].includes(r.status));
    const myAwaitingQuotes = myRequests.filter(r => r.status === "awaiting_quotes");
    return [
      {
        label: "My Requests", value: myRequests.length,
        sub: `${myRequests.filter(r => r.status === "draft").length} draft${myRequests.filter(r => r.status === "draft").length !== 1 ? "s" : ""}`,
        Icon: FileText, accentClass: "bg-muted text-muted-foreground",
        href: "/my-trips", testId: "kpi-my-requests",
      },
      {
        label: "In Review", value: myInReview.length,
        sub: myInReview.length > 0 ? "Waiting for approval" : "None pending",
        Icon: Clock,
        accentClass: myInReview.length > 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground",
        href: "/my-trips", pulse: myInReview.length > 0, testId: "kpi-in-review",
      },
      {
        label: "Upcoming Trips", value: myUpcoming.length,
        sub: myUpcoming.length > 0 ? `next: ${format(new Date(myUpcoming[0].startDate), "d MMM")}` : "No upcoming trips",
        Icon: PlaneTakeoff,
        accentClass: myUpcoming.length > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground",
        href: "/my-trips", testId: "kpi-upcoming",
      },
      {
        label: "Awaiting Quotes", value: myAwaitingQuotes.length,
        sub: myAwaitingQuotes.length > 0 ? "Vendor quotes being collected" : "None awaiting",
        Icon: Calendar,
        accentClass: myAwaitingQuotes.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        href: "/my-trips", testId: "kpi-awaiting-quotes",
      },
    ];
  })();

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading || requestsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-10" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-1 space-y-2 text-center">
                  <Skeleton className="h-3 w-20 mx-auto" />
                  <Skeleton className="h-8 w-8 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-home">
            {getTimeOfDay()}, {greetingName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-dynamic-subtitle">
            {dynamicSubtitle}
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
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800"
          data-testid="banner-needs-attention"
        >
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

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.testId} href={kpi.href}>
            <Card className="hover-elevate cursor-pointer h-full" data-testid={kpi.testId}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {kpi.label}
                    </p>
                    <p className="text-3xl font-bold mt-1.5 tracking-tight">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{kpi.sub}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${kpi.accentClass}`}>
                    <kpi.Icon className="w-4.5 h-4.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Pipeline ── */}
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
          <div className="flex items-center overflow-x-auto">
            {activePipeline.map((stage, i) => (
              <Link key={stage.label} href={stage.href} className="flex items-center flex-1 min-w-0">
                <div
                  className="flex-1 min-w-0 text-center px-2 py-1"
                  data-testid={`pipeline-${stage.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
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

      {/* ── Main Body: 2/3 + 1/3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Activity (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Waiting Longest — surfaced at top for managers */}
          {isManagerRole && overdueSubmitted.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  Waiting Longest
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:border-amber-700 dark:text-amber-400">
                    Action needed
                  </Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground">Oldest pending</span>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div>
                  {overdueSubmitted.map((r, i) => {
                    const waitDays = r.submittedAt
                      ? differenceInDays(today, new Date(r.submittedAt))
                      : 0;
                    return (
                      <Link key={r.id} href={`/requests/${r.id}`}>
                        <div
                          className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < overdueSubmitted.length - 1 ? "border-b" : ""}`}
                          data-testid={`overdue-${r.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {r.destination.city}, {r.destination.country}
                              {r.department && (
                                <span className="ml-1.5 opacity-70">· {r.department}</span>
                              )}
                            </p>
                          </div>
                          <Badge
                            variant={waitDays >= 5 ? "destructive" : "outline"}
                            className="text-xs shrink-0"
                          >
                            {waitDays === 0 ? "Today" : `${waitDays}d waiting`}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Departures */}
          {upcomingDepartures.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-primary" />
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
                        <div
                          className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < upcomingDepartures.length - 1 ? "border-b" : ""}`}
                          data-testid={`departure-${r.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {r.destination.city}, {r.destination.country}
                              &nbsp;·&nbsp;
                              {format(new Date(r.startDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge
                            variant={daysAway <= 3 ? "destructive" : daysAway <= 7 ? "outline" : "secondary"}
                            className="text-xs shrink-0"
                          >
                            {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway} days`}
                          </Badge>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  data-testid="button-view-all-activity"
                >
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
                    <Button variant="outline" size="sm" className="mt-3">
                      Create your first request
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  {recentRequests.map((r, i) => {
                    const isActionable =
                      ["submitted", "quotes_submitted"].includes(r.status) && isManagerRole;
                    return (
                      <Link key={r.id} href={`/requests/${r.id}`}>
                        <div
                          className={`flex items-center justify-between py-3 gap-3 cursor-pointer hover-elevate rounded px-1 ${i < recentRequests.length - 1 ? "border-b" : ""}`}
                          data-testid={`row-request-${r.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{r.employeeName}</p>
                              {isActionable && (
                                <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                                  <ArrowUpRight className="w-3 h-3" />
                                  Review
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {r.destination.city}, {r.destination.country}
                              {r.department && <span className="ml-1 opacity-70">· {r.department}</span>}
                            </p>
                          </div>
                          <StatusBadge status={r.status} id={r.id} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Who's Away Now (1/3) */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                Who's Away Now
              </CardTitle>
              <Link href="/travel-watch">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto py-1">
                  Watch <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {currentlyAway.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <PlaneLanding className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No one currently travelling</p>
                  <p className="text-xs mt-1">Active travellers appear here</p>
                </div>
              ) : (
                <div>
                  {currentlyAway.slice(0, 6).map((r, i) => {
                    const returnDays = differenceInDays(new Date(r.endDate), today);
                    const initials = r.employeeName
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <Link key={r.id} href={`/requests/${r.id}`}>
                        <div
                          className={`flex items-center gap-3 py-3 cursor-pointer hover-elevate rounded px-1 ${i < Math.min(currentlyAway.length, 6) - 1 ? "border-b" : ""}`}
                          data-testid={`away-${r.id}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-green-700 dark:text-green-400">
                              {initials}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {r.destination.city}, {r.destination.country}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground shrink-0 text-right">
                            {returnDays <= 0
                              ? "Returns today"
                              : returnDays === 1
                              ? "Back tomorrow"
                              : `${returnDays}d left`}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  {currentlyAway.length > 6 && (
                    <Link href="/travel-watch">
                      <p className="text-xs text-center text-muted-foreground pt-3 cursor-pointer hover:text-foreground transition-colors">
                        +{currentlyAway.length - 6} more · View all in Travel Watch
                      </p>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
