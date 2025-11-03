import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, MapPin, Clock, Download, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, subDays, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import type { TravelRequest } from "@shared/types";
import Papa from "papaparse";

export default function Analytics() {
  const { data: requests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Date range state - default to last 90 days
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Validate date range
  const isValidDateRange = useMemo(() => {
    if (!startDate || !endDate) return false; // Empty dates are invalid
    return new Date(startDate) <= new Date(endDate);
  }, [startDate, endDate]);

  // Filter requests by date range
  const filteredRequests = useMemo(() => {
    if (!isValidDateRange) return [];
    
    return requests.filter((r) => {
      const submittedDate = new Date(r.submittedAt);
      return isWithinInterval(submittedDate, {
        start: new Date(startDate),
        end: new Date(endDate),
      });
    });
  }, [requests, startDate, endDate, isValidDateRange]);

  const approvedRequests = filteredRequests.filter((r) => r.status === "approved");

  // Calculate previous period for trend comparison (non-overlapping)
  const { previousPeriodStart, previousPeriodEnd } = useMemo(() => {
    if (!isValidDateRange) {
      // Return placeholders when date range is invalid to prevent crashes
      return { previousPeriodStart: "", previousPeriodEnd: "" };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; // Include both days
    
    return {
      previousPeriodStart: format(subDays(start, durationDays), "yyyy-MM-dd"),
      previousPeriodEnd: format(subDays(start, 1), "yyyy-MM-dd"),
    };
  }, [startDate, endDate, isValidDateRange]);

  const previousPeriodRequests = useMemo(() => {
    if (!isValidDateRange) return [];
    
    return requests.filter((r) => {
      const submittedDate = new Date(r.submittedAt);
      return r.status === "approved" && isWithinInterval(submittedDate, {
        start: new Date(previousPeriodStart),
        end: new Date(previousPeriodEnd),
      });
    });
  }, [requests, previousPeriodStart, previousPeriodEnd, isValidDateRange]);

  // Calculate average approval time
  const avgApprovalTime = (() => {
    const timesInDays = approvedRequests
      .filter((r) => r.reviewedAt)
      .map((r) => {
        const submitted = new Date(r.submittedAt);
        const reviewed = new Date(r.reviewedAt!);
        return (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24);
      });

    if (timesInDays.length === 0) return 0;
    return timesInDays.reduce((a, b) => a + b, 0) / timesInDays.length;
  })();

  // Spend by cost centre
  const spendByCostCentre = (() => {
    const byCC: Record<string, number> = {};
    approvedRequests.forEach((r) => {
      const key = `${r.costCentre.code}`;
      const cost = r.costBreakdown?.totalCost || r.perDiem.totalFJD;
      byCC[key] = (byCC[key] || 0) + cost;
    });

    return Object.entries(byCC)
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => b.total - a.total);
  })();

  // Top destinations (from filtered requests)
  const topDestinations = (() => {
    const byCityCountry: Record<string, number> = {};
    filteredRequests.forEach((r) => {
      const key = `${r.destination.city}, ${r.destination.country}`;
      byCityCountry[key] = (byCityCountry[key] || 0) + 1;
    });

    return Object.entries(byCityCountry)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  })();

  // Funding type distribution
  const fundingTypeDistribution = (() => {
    const dist: Record<string, number> = { advance: 0, reimbursement: 0 };
    approvedRequests.forEach((r) => {
      dist[r.fundingType] = (dist[r.fundingType] || 0) + 1;
    });

    return [
      { name: "Advance", value: dist.advance },
      { name: "Reimbursement", value: dist.reimbursement },
    ];
  })();

  const totalSpend = approvedRequests.reduce(
    (sum, r) => sum + (r.costBreakdown?.totalCost || r.perDiem.totalFJD), 
    0
  );

  const previousPeriodSpend = previousPeriodRequests.reduce(
    (sum, r) => sum + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
    0
  );

  // Calculate trends
  const spendTrend = previousPeriodSpend === 0 ? 0 : ((totalSpend - previousPeriodSpend) / previousPeriodSpend) * 100;
  const requestCountTrend = previousPeriodRequests.length === 0 ? 0 : ((approvedRequests.length - previousPeriodRequests.length) / previousPeriodRequests.length) * 100;

  // Monthly spend trend (within selected date range)
  const monthlySpendTrend = useMemo(() => {
    if (!isValidDateRange) return [];
    
    // Get months that fall within the selected date range
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      // Only count requests within both the month AND the selected date range
      const monthRequests = filteredRequests.filter((r) => {
        const submittedDate = new Date(r.submittedAt);
        return isWithinInterval(submittedDate, { start: monthStart, end: monthEnd });
      });
      const monthSpend = monthRequests.reduce((sum, r) => sum + (r.costBreakdown?.totalCost || r.perDiem.totalFJD), 0);
      return {
        month: format(month, "MMM yyyy"),
        spend: monthSpend,
        count: monthRequests.length,
      };
    });
  }, [filteredRequests, startDate, endDate, isValidDateRange]);

  // Export analytics data
  const exportAnalytics = () => {
    const exportData = approvedRequests.map((r) => ({
      "Request ID": r.id,
      "Employee": r.employeeName,
      "Department": r.department,
      "Destination": `${r.destination.city}, ${r.destination.country}`,
      "Travel Start": format(new Date(r.startDate), "yyyy-MM-dd"),
      "Travel End": format(new Date(r.endDate), "yyyy-MM-dd"),
      "Duration (days)": r.perDiem.days,
      "Cost Centre": r.costCentre.code,
      "Funding Type": r.fundingType,
      "Total Cost (FJD)": (r.costBreakdown?.totalCost || r.perDiem.totalFJD).toFixed(2),
      "Submitted": format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm"),
      "Approved": r.reviewedAt ? format(new Date(r.reviewedAt), "yyyy-MM-dd HH:mm") : "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `travel-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // Quick date range presets
  const setDatePreset = (preset: "7d" | "30d" | "90d" | "6m" | "1y") => {
    const end = new Date();
    let start = new Date();

    switch (preset) {
      case "7d":
        start = subDays(end, 7);
        break;
      case "30d":
        start = subDays(end, 30);
        break;
      case "90d":
        start = subDays(end, 90);
        break;
      case "6m":
        start = subMonths(end, 6);
        break;
      case "1y":
        start = subMonths(end, 12);
        break;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Travel request insights and key performance indicators
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Travel request insights and key performance indicators
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
            <p className="text-muted-foreground">
              Analytics will appear here once travel requests are submitted and approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isZero = value === 0;
    return (
      <div className={`flex items-center gap-1 text-xs ${isZero ? 'text-muted-foreground' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {!isZero && (isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
        <span>{isZero ? 'No change' : `${isPositive ? '+' : ''}${value.toFixed(1)}%`}</span>
        <span className="text-muted-foreground">vs prev period</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Travel request insights and key performance indicators
        </p>
      </div>

      {/* Date Range Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                data-testid="input-analytics-start-date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
                data-testid="input-analytics-end-date"
              />
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setDatePreset("7d")} data-testid="button-preset-7d">
                  Last 7 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDatePreset("30d")} data-testid="button-preset-30d">
                  Last 30 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDatePreset("90d")} data-testid="button-preset-90d">
                  Last 90 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDatePreset("6m")} data-testid="button-preset-6m">
                  Last 6 months
                </Button>
                <Button variant="primary" size="sm" onClick={exportAnalytics} className="gap-2" data-testid="button-export-analytics">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invalid Date Range Alert */}
      {!isValidDateRange && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Invalid date range: End date must be after or equal to start date.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-[hsl(var(--ocean-light))] to-[hsl(var(--ocean-light))] dark:from-[hsl(var(--ocean-light))] dark:to-[hsl(var(--ocean-light))] border-[hsl(var(--ocean))] border-opacity-20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Total Spend</div>
              <DollarSign className="w-5 h-5 text-[hsl(var(--ocean))]" />
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--ocean))]">
              FJD {totalSpend.toFixed(2)}
            </div>
            <div className="mt-2">
              <TrendIndicator value={spendTrend} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {approvedRequests.length} approved requests
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[hsl(var(--lagoon-light))] to-[hsl(var(--lagoon-light))] dark:from-[hsl(var(--lagoon-light))] dark:to-[hsl(var(--lagoon-light))] border-[hsl(var(--lagoon))] border-opacity-20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Request Count</div>
              <TrendingUp className="w-5 h-5 text-[hsl(var(--lagoon))]" />
            </div>
            <div className="text-2xl font-bold text-[hsl(var(--lagoon))]">
              {approvedRequests.length}
            </div>
            <div className="mt-2">
              <TrendIndicator value={requestCountTrend} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Approved in period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Avg Approval Time</div>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {avgApprovalTime.toFixed(1)} days
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              From submission to approval
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Top Destination</div>
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {topDestinations[0]?.destination.split(",")[0] || "N/A"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {topDestinations[0]?.count || 0} requests
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Cost Centres</div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{spendByCostCentre.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Active cost centres
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Spend by Cost Centre</CardTitle>
            <CardDescription>Total per diem by cost centre (FJD)</CardDescription>
          </CardHeader>
          <CardContent>
            {spendByCostCentre.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendByCostCentre}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funding Type Distribution</CardTitle>
            <CardDescription>Breakdown of advance vs reimbursement</CardDescription>
          </CardHeader>
          <CardContent>
            {fundingTypeDistribution.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {fundingTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spend Trend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monthly Spend Trend</CardTitle>
          <CardDescription>Travel expenses over the last 6 months</CardDescription>
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
                <Line type="monotone" dataKey="spend" stroke="hsl(var(--ocean))" strokeWidth={2} name="Total Spend (FJD)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No monthly trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Destinations Table */}
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
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{dest.destination}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{dest.count}</div>
                    <div className="text-sm text-muted-foreground">requests</div>
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
  );
}
