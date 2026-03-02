import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, DollarSign, MapPin, Clock, Download, Calendar,
  ArrowUpRight, ArrowDownRight, AlertTriangle, FileDown, FileSpreadsheet,
  FileText, BarChart3, Building2, Globe, ChevronUp, ChevronDown,
  ArrowRight, Filter, X, FileBarChart, Receipt, CheckCircle, XCircle,
  ChevronRight, Loader2, Eye,
} from "lucide-react";
import {
  format, subDays, subMonths, isWithinInterval,
  startOfMonth, endOfMonth, eachMonthOfInterval,
} from "date-fns";
import type { TravelRequest, CostCentre, ExpenseClaim } from "@shared/types";
import { CostCentreAdapter } from "@/data/adapters/CostCentreAdapter";
import { useEffect } from "react";
import {
  exportToCSV, exportToExcel, exportToXeroCSV, exportToMYOBCSV,
  exportToJournalCSV, exportToPDFSummary, generateExportFilename,
} from "@/utils/export";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type SortKey = "id" | "employeeName" | "department" | "destination" | "startDate" | "costCentre" | "total" | "status" | "submittedAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const CLAIM_STATUS_CONFIG = {
  draft: { label: "Draft", color: "secondary" as const },
  submitted: { label: "Submitted", color: "outline" as const },
  under_review: { label: "Under Review", color: "default" as const },
  approved: { label: "Approved", color: "default" as const },
  rejected: { label: "Rejected", color: "destructive" as const },
  paid: { label: "Paid", color: "default" as const },
};

export default function Reports() {
  const qc = useQueryClient();
  const { data: allRequests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  useEffect(() => {
    CostCentreAdapter.list().then(setCostCentres);
  }, []);

  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 90), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [department, setDepartment] = useState("all");
  const [costCentre, setCostCentre] = useState("all");

  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const { data: allClaims = [] } = useQuery<ExpenseClaim[]>({
    queryKey: ["/api/expense-claims"],
  });
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [claimAction, setClaimAction] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [claimActionLoading, setClaimActionLoading] = useState(false);
  const [claimSearch, setClaimSearch] = useState("");
  const [claimStatusFilter, setClaimStatusFilter] = useState("all");

  async function handleClaimAction(claimId: string, action: "approve" | "reject", reason?: string) {
    setClaimActionLoading(true);
    try {
      if (action === "approve") {
        await apiRequest("POST", `/api/expense-claims/${claimId}/approve`, {});
      } else {
        await apiRequest("POST", `/api/expense-claims/${claimId}/reject`, { reason });
      }
      qc.invalidateQueries({ queryKey: ["/api/expense-claims"] });
      setSelectedClaim(null);
      setClaimAction(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to process claim action", err);
    } finally {
      setClaimActionLoading(false);
    }
  }

  const filteredClaims = useMemo(() => {
    return allClaims.filter(c => {
      const matchStatus = claimStatusFilter === "all" || c.status === claimStatusFilter;
      const matchSearch = !claimSearch ||
        (c.travelRequestRef || c.requestId).toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.employeeName.toLowerCase().includes(claimSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [allClaims, claimStatusFilter, claimSearch]);

  const claimTotalPending = useMemo(() =>
    allClaims.filter(c => ["submitted", "under_review"].includes(c.status)).reduce((s, c) => s + c.totalAmount, 0),
    [allClaims]
  );
  const claimTotalApproved = useMemo(() =>
    allClaims.filter(c => ["approved", "paid"].includes(c.status)).reduce((s, c) => s + c.totalAmount, 0),
    [allClaims]
  );
  const claimAwaitingReview = useMemo(() =>
    allClaims.filter(c => ["submitted", "under_review"].includes(c.status)).length,
    [allClaims]
  );
  const claimAvgSize = useMemo(() =>
    allClaims.length > 0 ? allClaims.reduce((s, c) => s + c.totalAmount, 0) / allClaims.length : 0,
    [allClaims]
  );

  const isValidDateRange = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(startDate) <= new Date(endDate);
  }, [startDate, endDate]);

  const filteredRequests = useMemo(() => {
    if (!isValidDateRange) return [];

    return allRequests.filter((r) => {
      const submittedDate = new Date(r.submittedAt);
      const inRange = isWithinInterval(submittedDate, {
        start: new Date(startDate),
        end: new Date(endDate),
      });
      if (!inRange) return false;
      if (department !== "all" && r.department !== department) return false;
      if (costCentre !== "all" && r.costCentre.code !== costCentre) return false;
      return true;
    });
  }, [allRequests, startDate, endDate, department, costCentre, isValidDateRange]);

  const approvedRequests = useMemo(
    () => filteredRequests.filter((r) => r.status === "approved"),
    [filteredRequests]
  );

  const departments = useMemo(
    () => Array.from(new Set(allRequests.map((r) => r.department))).sort(),
    [allRequests]
  );

  const { previousPeriodRequests, spendTrend, requestCountTrend } = useMemo(() => {
    if (!isValidDateRange) return { previousPeriodRequests: [], spendTrend: 0, requestCountTrend: 0 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevStart = subDays(start, durationDays);
    const prevEnd = subDays(start, 1);

    const prevReqs = allRequests.filter((r) => {
      const d = new Date(r.submittedAt);
      return (
        r.status === "approved" &&
        isWithinInterval(d, { start: prevStart, end: prevEnd })
      );
    });

    const totalCost = approvedRequests.reduce(
      (s, r) => s + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
      0
    );
    const prevCost = prevReqs.reduce(
      (s, r) => s + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
      0
    );

    return {
      previousPeriodRequests: prevReqs,
      spendTrend: prevCost === 0 ? 0 : ((totalCost - prevCost) / prevCost) * 100,
      requestCountTrend:
        prevReqs.length === 0
          ? 0
          : ((approvedRequests.length - prevReqs.length) / prevReqs.length) * 100,
    };
  }, [allRequests, approvedRequests, startDate, endDate, isValidDateRange]);

  const totalSpend = useMemo(
    () =>
      approvedRequests.reduce(
        (s, r) => s + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
        0
      ),
    [approvedRequests]
  );

  const avgApprovalTime = useMemo(() => {
    const times = approvedRequests
      .filter((r) => r.reviewedAt)
      .map(
        (r) =>
          (new Date(r.reviewedAt!).getTime() - new Date(r.submittedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    return times.length === 0 ? 0 : times.reduce((a, b) => a + b, 0) / times.length;
  }, [approvedRequests]);

  const topDestinations = useMemo(() => {
    const byDest: Record<string, number> = {};
    filteredRequests.forEach((r) => {
      const k = `${r.destination.city}, ${r.destination.country}`;
      byDest[k] = (byDest[k] || 0) + 1;
    });
    return Object.entries(byDest)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredRequests]);

  const monthlySpendTrend = useMemo(() => {
    if (!isValidDateRange) return [];
    const months = eachMonthOfInterval({
      start: new Date(startDate),
      end: new Date(endDate),
    });
    return months.map((month) => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const monthReqs = filteredRequests.filter((r) =>
        isWithinInterval(new Date(r.submittedAt), { start: ms, end: me })
      );
      return {
        month: format(month, "MMM yyyy"),
        spend: monthReqs.reduce(
          (s, r) => s + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
          0
        ),
        count: monthReqs.length,
      };
    });
  }, [filteredRequests, startDate, endDate, isValidDateRange]);

  const spendByCostCentre = useMemo(() => {
    const byCC: Record<string, number> = {};
    approvedRequests.forEach((r) => {
      byCC[r.costCentre.code] = (byCC[r.costCentre.code] || 0) +
        (r.costBreakdown?.totalCost || r.perDiem.totalFJD);
    });
    return Object.entries(byCC)
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => b.total - a.total);
  }, [approvedRequests]);

  const spendByDepartment = useMemo(() => {
    const byDept: Record<string, number> = {};
    approvedRequests.forEach((r) => {
      byDept[r.department] = (byDept[r.department] || 0) +
        (r.costBreakdown?.totalCost || r.perDiem.totalFJD);
    });
    return Object.entries(byDept)
      .map(([dept, total]) => ({ dept, total }))
      .sort((a, b) => b.total - a.total);
  }, [approvedRequests]);

  const fundingTypeDistribution = useMemo(() => {
    const dist: Record<string, number> = { advance: 0, reimbursement: 0 };
    approvedRequests.forEach((r) => {
      dist[r.fundingType] = (dist[r.fundingType] || 0) + 1;
    });
    return [
      { name: "Advance", value: dist.advance },
      { name: "Reimbursement", value: dist.reimbursement },
    ];
  }, [approvedRequests]);

  const domesticVsInternational = useMemo(() => {
    const fiji = approvedRequests.filter(
      (r) => r.destination.country.toLowerCase() === "fiji"
    );
    const intl = approvedRequests.filter(
      (r) => r.destination.country.toLowerCase() !== "fiji"
    );
    const fijiCost = fiji.reduce(
      (s, r) => s + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
      0
    );
    const intlCost = intl.reduce(
      (s, r) => s + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
      0
    );
    return { fiji, intl, fijiCost, intlCost };
  }, [approvedRequests]);

  const sortedFilteredRequests = useMemo(() => {
    const arr = [...filteredRequests];
    arr.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (sortKey) {
        case "id": aVal = a.id; bVal = b.id; break;
        case "employeeName": aVal = a.employeeName; bVal = b.employeeName; break;
        case "department": aVal = a.department; bVal = b.department; break;
        case "destination": aVal = `${a.destination.city},${a.destination.country}`; bVal = `${b.destination.city},${b.destination.country}`; break;
        case "startDate": aVal = a.startDate; bVal = b.startDate; break;
        case "costCentre": aVal = a.costCentre.code; bVal = b.costCentre.code; break;
        case "total": aVal = a.costBreakdown?.totalCost || a.perDiem.totalFJD; bVal = b.costBreakdown?.totalCost || b.perDiem.totalFJD; break;
        case "status": aVal = a.status; bVal = b.status; break;
        case "submittedAt": aVal = a.submittedAt; bVal = b.submittedAt; break;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredRequests, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedFilteredRequests.length / PAGE_SIZE);
  const pagedRequests = sortedFilteredRequests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const setDatePreset = (preset: "7d" | "30d" | "90d" | "6m" | "1y") => {
    const end = new Date();
    let start = new Date();
    if (preset === "7d") start = subDays(end, 7);
    else if (preset === "30d") start = subDays(end, 30);
    else if (preset === "90d") start = subDays(end, 90);
    else if (preset === "6m") start = subMonths(end, 6);
    else start = subMonths(end, 12);
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setPage(1);
  };

  const clearFilters = () => {
    setStartDate(format(subDays(new Date(), 90), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setDepartment("all");
    setCostCentre("all");
    setPage(1);
  };

  const exportFilters = { startDate, endDate, department, costCentre };

  const statusColors: Record<string, string> = {
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    awaiting_quotes: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    quotes_submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPos = value > 0;
    const isZero = value === 0;
    return (
      <div
        className={`flex items-center gap-1 text-xs ${
          isZero
            ? "text-muted-foreground"
            : isPos
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {!isZero &&
          (isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
        <span>{isZero ? "No change" : `${isPos ? "+" : ""}${value.toFixed(1)}%`}</span>
        <span className="text-muted-foreground">vs prev period</span>
      </div>
    );
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const SortTh = ({
    col,
    children,
    className = "",
  }: {
    col: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(col)}
      data-testid={`th-${col}`}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-muted-foreground">Travel analytics, transactions, and accounting exports</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Reports</h1>
        <p className="text-muted-foreground">
          Travel analytics, transaction detail, and accounting exports
        </p>
      </div>

      {/* Shared Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-36"
                data-testid="input-report-start-date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-36"
                data-testid="input-report-end-date"
              />
            </div>
            <Select
              value={department}
              onValueChange={(v) => { setDepartment(v); setPage(1); }}
            >
              <SelectTrigger className="w-44" data-testid="select-report-department">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={costCentre}
              onValueChange={(v) => { setCostCentre(v); setPage(1); }}
            >
              <SelectTrigger className="w-44" data-testid="select-report-cost-centre">
                <SelectValue placeholder="All cost centres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cost centres</SelectItem>
                {costCentres.map((cc) => (
                  <SelectItem key={cc.code} value={cc.code}>
                    {cc.code} — {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5 flex-wrap">
              {(["7d", "30d", "90d", "6m", "1y"] as const).map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  onClick={() => setDatePreset(p)}
                  data-testid={`button-preset-${p}`}
                >
                  {p === "7d" ? "7 days" : p === "30d" ? "30 days" : p === "90d" ? "90 days" : p === "6m" ? "6 months" : "1 year"}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5"
              data-testid="button-clear-filters"
            >
              <X className="w-3 h-3" />
              Reset
            </Button>
          </div>
          {!isValidDateRange && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Invalid date range — end date must be after start date.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4" data-testid="tabs-reports">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <FileText className="w-4 h-4 mr-1.5" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="cost-analysis" data-testid="tab-cost-analysis">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Cost Analysis
          </TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-export">
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </TabsTrigger>
          <TabsTrigger value="expense-claims" data-testid="tab-expense-claims">
            <Receipt className="w-4 h-4 mr-1.5" />
            Claims
          </TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB 1: OVERVIEW
        ============================================================ */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[hsl(var(--ocean-light))] to-[hsl(var(--ocean-light))] border-[hsl(var(--ocean))/20]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Total Spend</div>
                  <DollarSign className="w-5 h-5 text-[hsl(var(--ocean))]" />
                </div>
                <div className="text-2xl font-bold text-[hsl(var(--ocean))]" data-testid="stat-total-spend">
                  FJD {totalSpend.toLocaleString("en-FJ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={spendTrend} />
                <div className="text-xs text-muted-foreground mt-1">
                  {approvedRequests.length} approved requests
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[hsl(var(--lagoon-light))] to-[hsl(var(--lagoon-light))] border-[hsl(var(--lagoon))/20]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Request Count</div>
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--lagoon))]" />
                </div>
                <div className="text-2xl font-bold text-[hsl(var(--lagoon))]" data-testid="stat-request-count">
                  {approvedRequests.length}
                </div>
                <TrendIndicator value={requestCountTrend} />
                <div className="text-xs text-muted-foreground mt-1">Approved in period</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Avg Approval Time</div>
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-avg-approval">
                  {avgApprovalTime.toFixed(1)} days
                </div>
                <div className="text-xs text-muted-foreground mt-3">Submission to approval</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Top Destination</div>
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-top-destination">
                  {topDestinations[0]?.destination.split(",")[0] || "N/A"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {topDestinations[0]?.count || 0} requests
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Spend Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spend Trend</CardTitle>
              <CardDescription>Total travel spend per month in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlySpendTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlySpendTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`FJD ${value.toFixed(2)}`, "Spend"]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="spend"
                      stroke="hsl(var(--ocean))"
                      strokeWidth={2}
                      name="Total Spend (FJD)"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data — adjust the date range to include more months
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Count per Month */}
          <Card>
            <CardHeader>
              <CardTitle>Requests per Month</CardTitle>
              <CardDescription>Volume of travel requests submitted per month</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlySpendTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlySpendTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "Requests"]} />
                    <Bar dataKey="count" fill="hsl(var(--lagoon))" name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            TAB 2: TRANSACTIONS
        ============================================================ */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {sortedFilteredRequests.length}
              </span>{" "}
              request{sortedFilteredRequests.length !== 1 ? "s" : ""} matching filters
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Page {page} of {Math.max(1, totalPages)}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-transactions">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <SortTh col="id" className="pl-4">Ref</SortTh>
                      <SortTh col="employeeName">Employee</SortTh>
                      <SortTh col="department">Department</SortTh>
                      <SortTh col="destination">Destination</SortTh>
                      <SortTh col="startDate">Dates</SortTh>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Days
                      </th>
                      <SortTh col="costCentre">Cost Centre</SortTh>
                      <SortTh col="total">Total FJD</SortTh>
                      <SortTh col="status">Status</SortTh>
                      <SortTh col="submittedAt">Submitted</SortTh>
                      <th className="px-3 py-2 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-muted-foreground">
                          No requests match the current filters
                        </td>
                      </tr>
                    ) : (
                      pagedRequests.map((req, idx) => {
                        const totalCost =
                          req.costBreakdown?.totalCost || req.perDiem.totalFJD;
                        return (
                          <tr
                            key={req.id}
                            className={`border-b last:border-0 ${
                              idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                            } hover:bg-muted/40 transition-colors`}
                            data-testid={`row-request-${req.id}`}
                          >
                            <td className="px-3 py-3 pl-4 font-mono text-xs text-muted-foreground">
                              {req.id.slice(0, 8)}…
                            </td>
                            <td className="px-3 py-3 font-medium">{req.employeeName}</td>
                            <td className="px-3 py-3 text-muted-foreground">{req.department}</td>
                            <td className="px-3 py-3">
                              {req.destination.city}, {req.destination.country}
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(req.startDate), "dd/MM/yy")} —{" "}
                              {format(new Date(req.endDate), "dd/MM/yy")}
                            </td>
                            <td className="px-3 py-3 text-center">{req.perDiem.days}</td>
                            <td className="px-3 py-3 text-muted-foreground font-mono text-xs">
                              {req.costCentre.code}
                            </td>
                            <td className="px-3 py-3 font-semibold text-right tabular-nums">
                              {totalCost.toFixed(2)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  statusColors[req.status] || "bg-muted text-muted-foreground"
                                }`}
                                data-testid={`badge-status-${req.id}`}
                              >
                                {req.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(req.submittedAt), "dd MMM yyyy")}
                            </td>
                            <td className="px-3 py-3 pr-4">
                              <Link href={`/requests/${req.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-view-${req.id}`}
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 7) {
                    if (page <= 4) pageNum = i + 1;
                    else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                    else pageNum = page - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                      className="w-8 px-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ============================================================
            TAB 3: COST ANALYSIS
        ============================================================ */}
        <TabsContent value="cost-analysis" className="space-y-6">
          {/* Domestic vs International */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      Domestic (Fiji)
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      FJD {domesticVsInternational.fijiCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-muted-foreground/30">
                    {domesticVsInternational.fiji.length}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {domesticVsInternational.fiji.length} requests within Fiji
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      International
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      FJD {domesticVsInternational.intlCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-muted-foreground/30">
                    {domesticVsInternational.intl.length}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {domesticVsInternational.intl.length} international requests
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spend by Cost Centre */}
          <Card>
            <CardHeader>
              <CardTitle>Spend by Cost Centre</CardTitle>
              <CardDescription>Total approved spend per cost centre (FJD)</CardDescription>
            </CardHeader>
            <CardContent>
              {spendByCostCentre.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={spendByCostCentre} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="code" width={60} />
                    <Tooltip formatter={(v: number) => [`FJD ${v.toFixed(2)}`, "Spend"]} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Spend (FJD)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No approved requests in this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spend by Department */}
          <Card>
            <CardHeader>
              <CardTitle>Spend by Department</CardTitle>
              <CardDescription>Total approved spend per department (FJD)</CardDescription>
            </CardHeader>
            <CardContent>
              {spendByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={spendByDepartment} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="dept" width={80} />
                    <Tooltip formatter={(v: number) => [`FJD ${v.toFixed(2)}`, "Spend"]} />
                    <Bar dataKey="total" fill="hsl(var(--lagoon))" name="Spend (FJD)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No approved requests in this period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funding Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Funding Type</CardTitle>
                <CardDescription>Advance vs reimbursement split</CardDescription>
              </CardHeader>
              <CardContent>
                {fundingTypeDistribution.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={fundingTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        dataKey="value"
                      >
                        {fundingTypeDistribution.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Destinations */}
            <Card>
              <CardHeader>
                <CardTitle>Top Destinations</CardTitle>
                <CardDescription>Most frequently traveled destinations</CardDescription>
              </CardHeader>
              <CardContent>
                {topDestinations.length > 0 ? (
                  <div className="space-y-2">
                    {topDestinations.map((dest, index) => (
                      <div
                        key={dest.destination}
                        className="flex items-center justify-between p-2.5 rounded-lg border"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-sm">{dest.destination}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-sm">{dest.count}</span>
                          <span className="text-xs text-muted-foreground ml-1">trips</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No destination data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================
            TAB 4: EXPORT
        ============================================================ */}
        <TabsContent value="export" className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">All Filtered Requests</div>
                <div className="text-3xl font-bold" data-testid="stat-export-total">
                  {filteredRequests.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">All statuses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Approved Only</div>
                <div className="text-3xl font-bold text-[hsl(var(--ocean))]" data-testid="stat-export-approved">
                  {approvedRequests.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  FJD {totalSpend.toFixed(2)} total
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Cost Centres</div>
                <div className="text-3xl font-bold">
                  {new Set(filteredRequests.map((r) => r.costCentre.code)).size}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Represented in filtered data</div>
              </CardContent>
            </Card>
          </div>

          {/* Standard exports */}
          <Card>
            <CardHeader>
              <CardTitle>Standard Formats</CardTitle>
              <CardDescription>
                General-purpose exports — includes all approved requests matching current filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={approvedRequests.length === 0}
                  onClick={() =>
                    exportToCSV(
                      approvedRequests,
                      generateExportFilename("csv", exportFilters)
                    )
                  }
                  data-testid="button-export-csv"
                >
                  <FileDown className="w-4 h-4" />
                  <div className="text-left">
                    <div>Export as CSV</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Universal spreadsheet
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={approvedRequests.length === 0}
                  onClick={() =>
                    exportToExcel(
                      approvedRequests,
                      generateExportFilename("xlsx", exportFilters)
                    )
                  }
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <div className="text-left">
                    <div>Export as Excel</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      XLSX with auto-width columns
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={approvedRequests.length === 0}
                  onClick={() =>
                    exportToPDFSummary(
                      approvedRequests,
                      exportFilters,
                      generateExportFilename("pdf", exportFilters, "travel_report")
                    )
                  }
                  data-testid="button-export-pdf"
                >
                  <FileText className="w-4 h-4" />
                  <div className="text-left">
                    <div>PDF Summary Report</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Print or email to management
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Accounting / ERP exports */}
          <Card>
            <CardHeader>
              <CardTitle>Accounting System Exports</CardTitle>
              <CardDescription>
                Formatted for direct import into popular accounting software used in Fiji. All formats use approved requests only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={approvedRequests.length === 0}
                  onClick={() =>
                    exportToXeroCSV(
                      approvedRequests,
                      generateExportFilename("csv", exportFilters, "xero_journal")
                    )
                  }
                  data-testid="button-export-xero"
                >
                  <FileBarChart className="w-4 h-4" />
                  <div className="text-left">
                    <div>Xero Manual Journal</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Accounting &rarr; Manual Journals &rarr; Import
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={approvedRequests.length === 0}
                  onClick={() =>
                    exportToMYOBCSV(
                      approvedRequests,
                      generateExportFilename("csv", exportFilters, "myob_journal")
                    )
                  }
                  data-testid="button-export-myob"
                >
                  <FileBarChart className="w-4 h-4" />
                  <div className="text-left">
                    <div>MYOB AccountRight</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      File &rarr; Import Data &rarr; General Journals
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={approvedRequests.length === 0}
                  onClick={() =>
                    exportToJournalCSV(
                      approvedRequests,
                      generateExportFilename("csv", exportFilters, "journal_entries")
                    )
                  }
                  data-testid="button-export-journal"
                >
                  <FileBarChart className="w-4 h-4" />
                  <div className="text-left">
                    <div>Double-Entry Journal</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Generic Dr/Cr format for any ERP
                    </div>
                  </div>
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                <div className="font-semibold">About the accounting formats</div>
                <ul className="text-muted-foreground space-y-1.5 text-xs">
                  <li>
                    <span className="font-medium text-foreground">Xero:</span> Creates Manual Journal entries in Xero. Account code 6200 (Travel Expense), Tax Type BASEXCLUDED. Cost centres map to Xero Tracking Options.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">MYOB AccountRight:</span> Import via File &rarr; Import Data &rarr; General Journal Entries. Account 6-2000, Tax Code N-T. Cost centre codes map to MYOB Jobs.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Double-Entry Journal:</span> One debit (6200 Travel Expense) and one credit (2100 Accounts Payable for reimbursements, or 1120 Staff Travel Advances for advances) per request. Works with most accounting systems.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Export column reference */}
          <Card>
            <CardHeader>
              <CardTitle>Standard Export Columns</CardTitle>
              <CardDescription>Columns included in CSV and Excel exports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {[
                  "Request ID",
                  "Employee",
                  "Employee Number",
                  "Department",
                  "Cost Centre",
                  "Cost Centre Name",
                  "Status",
                  "Destination",
                  "Start Date",
                  "End Date",
                  "Days",
                  "Flights (FJD)",
                  "Accommodation (FJD)",
                  "Ground Transfers (FJD)",
                  "Visa Fees (FJD)",
                  "Per Diem (FJD)",
                  "Total Cost (FJD)",
                  "Funding Type",
                  "Submitted On",
                  "Approved On",
                ].map((col) => (
                  <div key={col} className="flex items-center gap-1.5 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                    {col}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            TAB 5: EXPENSE CLAIMS (Finance Manager Review)
        ============================================================ */}
        <TabsContent value="expense-claims" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Claims</div>
                <div className="text-2xl font-bold" data-testid="stat-claims-total">{allClaims.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Awaiting Review</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-claims-awaiting">
                  {claimAwaitingReview}
                </div>
                <div className="text-xs text-muted-foreground">FJD {claimTotalPending.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Approved This Period</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-claims-approved">
                  FJD {claimTotalApproved.toFixed(0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Avg. Claim Size</div>
                <div className="text-2xl font-bold" data-testid="stat-claims-avg">
                  FJD {claimAvgSize.toFixed(0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee or trip..."
                value={claimSearch}
                onChange={e => setClaimSearch(e.target.value)}
                className="pl-9"
                data-testid="input-claims-search"
              />
            </div>
            <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-claims-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Claims Table */}
          <Card>
            <CardContent className="p-0">
              {filteredClaims.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No claims found</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredClaims.map(claim => {
                    const cfg = CLAIM_STATUS_CONFIG[claim.status] || CLAIM_STATUS_CONFIG.draft;
                    const linkedRequest = allRequests.find(r => r.id === claim.requestId);
                    const budget = linkedRequest?.estimatedCost || 0;
                    const variance = claim.totalAmount - budget;
                    return (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between gap-4 p-4 hover-elevate cursor-pointer"
                        onClick={() => setSelectedClaim(claim)}
                        data-testid={`claim-row-${claim.id}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{claim.employeeName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {claim.travelRequestRef || claim.requestId}
                            {linkedRequest && linkedRequest.destination && ` • ${typeof linkedRequest.destination === "object" ? `${(linkedRequest.destination as any).city}` : linkedRequest.destination}`}
                          </p>
                          {claim.submittedAt && (
                            <p className="text-xs text-muted-foreground">
                              Submitted {format(new Date(claim.submittedAt), "d MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold">
                              FJD {claim.totalAmount.toFixed(2)}
                            </p>
                            {budget > 0 && (
                              <p className={`text-xs ${variance > 0 ? "text-destructive" : "text-green-600"}`}>
                                {variance > 0 ? "+" : ""}{variance.toFixed(2)} vs budget
                              </p>
                            )}
                          </div>
                          <Badge variant={cfg.color}>{cfg.label}</Badge>
                          <Button size="icon" variant="ghost" data-testid={`button-review-${claim.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Claim Review Side Sheet */}
      <Sheet open={!!selectedClaim} onOpenChange={v => { if (!v) { setSelectedClaim(null); setClaimAction(null); setRejectReason(""); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-claim-review">
          {selectedClaim && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Expense Claim Review
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4">
                {/* Claim meta */}
                <div className="rounded-md border border-border p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee</span>
                    <span className="font-medium">{selectedClaim.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trip</span>
                    <span>{selectedClaim.travelRequestRef || selectedClaim.requestId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{selectedClaim.submittedAt ? format(new Date(selectedClaim.submittedAt), "d MMM yyyy") : "Draft"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Claimed</span>
                    <span className="text-primary">{selectedClaim.currency} {selectedClaim.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <p className="text-sm font-semibold mb-2">Line Items ({selectedClaim.lineItems.length})</p>
                  <div className="space-y-2">
                    {selectedClaim.lineItems.map((item, i) => (
                      <div key={item.id || i} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.description || item.merchantName || "Item"}</p>
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                            {item.merchantName && item.description !== item.merchantName && (
                              <p className="text-xs text-muted-foreground">{item.merchantName}</p>
                            )}
                            {item.receiptDate && (
                              <p className="text-xs text-muted-foreground">{item.receiptDate}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{selectedClaim.currency} {item.amount.toFixed(2)}</p>
                            {item.ocrConfidence && (
                              <Badge variant={item.ocrConfidence === "high" ? "secondary" : "outline"} className="text-xs">
                                {item.ocrConfidence === "high" ? "Auto-filled" : "Manual"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {item.receiptUrl && (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-1 block"
                            data-testid={`link-receipt-${item.id}`}
                          >
                            View receipt
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Previous review notes */}
                {selectedClaim.reviewNotes && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm">
                    <p className="font-medium text-destructive mb-1">Previous rejection reason</p>
                    <p>{selectedClaim.reviewNotes}</p>
                  </div>
                )}

                {/* Actions */}
                {["submitted", "under_review"].includes(selectedClaim.status) && !claimAction && (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => setClaimAction("approve")}
                      data-testid="button-approve-claim"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setClaimAction("reject")}
                      data-testid="button-reject-claim"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {claimAction === "approve" && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Approve this claim for FJD {selectedClaim.totalAmount.toFixed(2)}?</p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleClaimAction(selectedClaim.id, "approve")}
                        disabled={claimActionLoading}
                        data-testid="button-confirm-approve"
                      >
                        {claimActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Confirm Approval
                      </Button>
                      <Button variant="outline" onClick={() => setClaimAction(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {claimAction === "reject" && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Reason for rejection</p>
                    <Textarea
                      placeholder="Explain why this claim is being rejected..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      data-testid="textarea-reject-reason"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleClaimAction(selectedClaim.id, "reject", rejectReason)}
                        disabled={claimActionLoading || !rejectReason.trim()}
                        data-testid="button-confirm-reject"
                      >
                        {claimActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Reject Claim
                      </Button>
                      <Button variant="outline" onClick={() => setClaimAction(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {["approved", "paid"].includes(selectedClaim.status) && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
                    <p className="font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Approved</p>
                    {selectedClaim.reviewedBy && <p className="mt-1">by {selectedClaim.reviewedBy}</p>}
                    {selectedClaim.reviewedAt && <p>{format(new Date(selectedClaim.reviewedAt), "d MMM yyyy")}</p>}
                  </div>
                )}

                {selectedClaim.status === "rejected" && !["submitted", "under_review"].includes(selectedClaim.status) && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm">
                    <p className="font-medium text-destructive flex items-center gap-2"><XCircle className="w-4 h-4" /> Rejected</p>
                    {selectedClaim.reviewedBy && <p className="mt-1">by {selectedClaim.reviewedBy}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
