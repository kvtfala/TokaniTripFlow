import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApprovalDialog } from "@/components/ApprovalDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, FileText, CheckCircle, Clock, XCircle, TrendingUp, BarChart3, Plane, MapPin, Download, Users, Search, Filter, X } from "lucide-react";
import { type TravelRequest } from "@shared/types";
import { format, parseISO, startOfMonth } from "date-fns";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Mock current user - in production this would come from auth
  const currentUser = { name: "Jone Ratudina", role: "employee" };

  const { data: requests = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const handleRowClick = (request: TravelRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  // Get unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.department))).sort();
  }, [requests]);

  // Apply search and filters
  const applyFiltersAndSearch = (requestList: TravelRequest[]) => {
    return requestList.filter(req => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        req.employeeName.toLowerCase().includes(searchLower) ||
        req.destination.city.toLowerCase().includes(searchLower) ||
        req.destination.country.toLowerCase().includes(searchLower) ||
        req.purpose.toLowerCase().includes(searchLower) ||
        req.department.toLowerCase().includes(searchLower);

      // Department filter
      const matchesDepartment = filterDepartment === "all" || req.department === filterDepartment;

      // Date range filter
      const reqStartDate = new Date(req.startDate);
      const matchesStartDate = !filterStartDate || reqStartDate >= new Date(filterStartDate);
      const matchesEndDate = !filterEndDate || reqStartDate <= new Date(filterEndDate);

      return matchesSearch && matchesDepartment && matchesStartDate && matchesEndDate;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDepartment("all");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const hasActiveFilters = searchQuery || filterDepartment !== "all" || filterStartDate || filterEndDate;

  const stats = useMemo(() => {
    const totalSpend = requests
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + (r.costBreakdown?.totalCost || r.perDiem.totalFJD), 0);
    
    const approvedCount = requests.filter(r => r.status === "approved").length;
    const avgTripCost = approvedCount > 0 ? totalSpend / approvedCount : 0;
    
    // Budget utilization (using annual travel budget)
    const annualBudget = 500000; // FJD - would come from config/database in production
    const budgetUtilization = annualBudget > 0 ? (totalSpend / annualBudget) * 100 : 0;
    
    const pendingApprovals = requests.filter(
      r => r.status === "submitted" || r.status === "in_review"
    ).length;

    return {
      totalSpend,
      avgTripCost,
      budgetUtilization,
      pendingApprovals,
      annualBudget,
    };
  }, [requests]);

  // Upcoming trips - approved requests with future end dates
  const upcomingTrips = useMemo(() => {
    const now = new Date();
    return requests
      .filter(r => r.status === "approved" && new Date(r.endDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [requests]);

  // Recent activity - latest 5 requests sorted by submission date
  const recentActivity = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5);
  }, [requests]);

  // Analytics data - Industry standard charts
  const analyticsData = useMemo(() => {
    // Monthly spend trend (last 6 months, chronologically sorted)
    const monthlySpendMap = new Map<string, { timestamp: Date; spend: number }>();
    
    requests.forEach(req => {
      if (req.status === "approved") {
        const monthStart = startOfMonth(parseISO(req.submittedAt));
        const monthKey = format(monthStart, "MMM yyyy");
        const existing = monthlySpendMap.get(monthKey);
        const cost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
        
        if (existing) {
          existing.spend += cost;
        } else {
          monthlySpendMap.set(monthKey, {
            timestamp: monthStart,
            spend: cost
          });
        }
      }
    });

    // Sort chronologically and limit to last 6 months
    const sortedMonthly = Array.from(monthlySpendMap.entries())
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
      .slice(-6);

    const monthlyChartData = sortedMonthly.map(([month, data]) => ({
      month,
      spend: Math.round(data.spend),
    }));

    // Department spend comparison
    const departmentSpend = requests.reduce((acc, req) => {
      if (req.status === "approved") {
        const cost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
        acc[req.department] = (acc[req.department] || 0) + cost;
      }
      return acc;
    }, {} as Record<string, number>);

    const departmentChartData = Object.entries(departmentSpend).map(([department, spend]) => ({
      department,
      spend: Math.round(spend),
    }));

    return {
      monthlyChartData,
      departmentChartData,
    };
  }, [requests]);


  const renderTable = (filteredRequests: TravelRequest[]) => {
    // Apply search and filters
    const displayedRequests = applyFiltersAndSearch(filteredRequests);

    if (displayedRequests.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {hasActiveFilters ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No travel requests match your search</p>
                <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-search">
                  <X className="w-4 h-4 mr-2" />
                  Clear filters
                </Button>
              </>
            ) : (
              "No travel requests found"
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Travel Dates</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleRowClick(request)}
                    data-testid={`row-request-${request.id}`}
                  >
                    <TableCell className="font-medium">{request.employeeName}</TableCell>
                    <TableCell>
                      {request.destination.city}, {request.destination.country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(request.startDate), 'dd MMM')} – {format(new Date(request.endDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                    <TableCell><StatusBadge status={request.status} type="request" /></TableCell>
                    <TableCell className="text-right">
                      FJD {(request.costBreakdown?.totalCost || request.perDiem.totalFJD).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.submittedAt), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Travel Requests Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start your journey by creating your first travel request. We'll help you manage approvals and track expenses.
          </p>
          <Link href="/request/new">
            <Button className="gap-2 h-12 bg-[hsl(var(--lagoon))] hover:bg-[hsl(var(--lagoon))]/90 text-white" data-testid="button-new-request-empty">
              <Plus className="w-5 h-5" />
              Create Your First Request
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bula, {currentUser.name}!</h1>
          <p className="text-muted-foreground mt-1">Welcome back to Tokani TripFlow</p>
        </div>
        <Link href="/request/new">
          <Button className="gap-2 h-12 bg-[hsl(var(--lagoon))] hover:bg-[hsl(var(--lagoon))]/90 text-white" data-testid="button-new-request">
            <Plus className="w-5 h-5" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Budget Alert */}
      {stats.budgetUtilization >= 80 && (
        <Card className="border-[hsl(var(--coral))] bg-[hsl(var(--coral-light))]/50 dark:bg-[hsl(var(--coral-light))]/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[hsl(var(--coral))] rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[hsl(var(--coral))] mb-1">Budget Alert</h3>
                <p className="text-sm">
                  You've used {stats.budgetUtilization.toFixed(1)}% of your annual travel budget (FJD {stats.annualBudget.toLocaleString()}).
                  {stats.budgetUtilization >= 90 && " Consider reviewing upcoming travel plans."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Stats - Pacific Theme (WCAG 2.1 AA Compliant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[hsl(var(--ocean-light))] to-[hsl(var(--ocean-light))] dark:from-[hsl(var(--ocean-light))] dark:to-[hsl(var(--ocean-light))] border-[hsl(var(--ocean))] border-opacity-20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Spend</p>
                <p className="text-3xl font-bold text-[hsl(var(--ocean))]" data-testid="text-stat-total-spend">
                  FJD {stats.totalSpend.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-[hsl(var(--ocean))] rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--lagoon-light))] to-[hsl(var(--lagoon-light))] dark:from-[hsl(var(--lagoon-light))] dark:to-[hsl(var(--lagoon-light))] border-[hsl(var(--lagoon))] border-opacity-20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Trip Cost</p>
                <p className="text-3xl font-bold text-[hsl(var(--lagoon))]" data-testid="text-stat-avg-tripcost">
                  FJD {stats.avgTripCost.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-[hsl(var(--lagoon))] rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--sand-light))] to-[hsl(var(--sand-light))] dark:from-[hsl(var(--sand-light))] dark:to-[hsl(var(--sand-light))] border-[hsl(var(--sand))] border-opacity-20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Budget Utilization</p>
                <p className="text-3xl font-bold text-[hsl(var(--ocean))]" data-testid="text-stat-budget-utilization">
                  {stats.budgetUtilization.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-[hsl(var(--ocean))] rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--coral-light))] to-[hsl(var(--coral-light))] dark:from-[hsl(var(--coral-light))] dark:to-[hsl(var(--coral-light))] border-[hsl(var(--coral))] border-opacity-20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Approvals</p>
                <p className="text-3xl font-bold text-[hsl(var(--coral))]" data-testid="text-stat-pending-approvals">{stats.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-[hsl(var(--coral))] rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Industry Standard */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/request/new" className="block">
              <Card className="hover-elevate cursor-pointer" data-testid="quick-action-new-request">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <Plus className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">Submit Request</div>
                    <div className="text-xs text-muted-foreground mt-1">Create new travel request</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/my-trips" className="block">
              <Card className="hover-elevate cursor-pointer" data-testid="quick-action-my-trips">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <Plane className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">My Trips</div>
                    <div className="text-xs text-muted-foreground mt-1">View your travel history</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/travel-watch" className="block">
              <Card className="hover-elevate cursor-pointer" data-testid="quick-action-travel-watch">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <MapPin className="w-8 h-8 text-secondary" />
                  <div className="text-center">
                    <div className="font-semibold">Travel Watch</div>
                    <div className="text-xs text-muted-foreground mt-1">Track active travelers</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/approvals" className="block">
              <Card className="hover-elevate cursor-pointer" data-testid="quick-action-approvals">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <Users className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">Approvals</div>
                    <div className="text-xs text-muted-foreground mt-1">Review pending requests</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Trips & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Trips Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Upcoming Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Plane className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming trips scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                    onClick={() => handleRowClick(trip)}
                    data-testid={`upcoming-trip-${trip.id}`}
                  >
                    <div className="w-10 h-10 bg-[hsl(var(--lagoon-light))] rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[hsl(var(--lagoon))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {trip.destination.city}, {trip.destination.country}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-[hsl(var(--ocean))]">
                        FJD {(trip.costBreakdown?.totalCost || trip.perDiem.totalFJD).toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                    onClick={() => handleRowClick(req)}
                    data-testid={`recent-activity-${req.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{req.employeeName}</span>
                        <StatusBadge status={req.status} type="request" />
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {req.destination.city} • {format(new Date(req.submittedAt), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-[hsl(var(--ocean))]">
                        FJD {(req.costBreakdown?.totalCost || req.perDiem.totalFJD).toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts - Industry Standard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Travel Spend Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData.monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.monthlyChartData}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00547A" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00547A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    label={{ value: 'FJD', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [`FJD ${value.toFixed(2)}`, 'Spend']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="spend" 
                    stroke="#00547A" 
                    fillOpacity={1} 
                    fill="url(#colorSpend)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No spend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Spend by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData.departmentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="department" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    label={{ value: 'FJD', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => [`FJD ${value.toFixed(2)}`, 'Spend']}
                  />
                  <Bar dataKey="spend" fill="#009BAA" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee, destination, or purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-requests"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                    data-testid="button-clear-search-input"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
                data-testid="button-toggle-filters"
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && !searchQuery && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {[filterDepartment !== "all", filterStartDate, filterEndDate].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <label className="text-sm font-medium mb-2 block">Department</label>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger data-testid="select-filter-department">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date (From)</label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    data-testid="input-filter-start-date"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date (To)</label>
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
                      data-testid="button-clear-all-filters"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {renderTable(requests)}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {renderTable(requests.filter(r => r.status === "submitted" || r.status === "in_review"))}
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          {renderTable(requests.filter(r => r.status === "approved"))}
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          {renderTable(requests.filter(r => r.status === "rejected"))}
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApprove={(id) => {
          console.log("Approved:", id);
          setDialogOpen(false);
        }}
        onReject={(id, comment) => {
          console.log("Rejected:", id, comment);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
