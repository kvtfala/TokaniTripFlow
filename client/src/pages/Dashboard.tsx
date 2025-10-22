import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApprovalDialog } from "@/components/ApprovalDialog";
import { Plus, FileText, CheckCircle, Clock, XCircle, TrendingUp, BarChart3, Plane, MapPin, Download, Users } from "lucide-react";
import { type TravelRequest } from "@shared/types";
import { format, parseISO, startOfMonth } from "date-fns";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const handleRowClick = (request: TravelRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const stats = useMemo(() => {
    const totalSpend = requests
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + r.perDiem.totalFJD, 0);
    
    const approvedCount = requests.filter(r => r.status === "approved").length;
    const avgPerDiem = approvedCount > 0 ? totalSpend / approvedCount : 0;
    
    // Budget utilization (using annual travel budget)
    const annualBudget = 500000; // FJD - would come from config/database in production
    const budgetUtilization = annualBudget > 0 ? (totalSpend / annualBudget) * 100 : 0;
    
    const pendingApprovals = requests.filter(
      r => r.status === "submitted" || r.status === "in_review"
    ).length;

    return {
      totalSpend,
      avgPerDiem,
      budgetUtilization,
      pendingApprovals,
    };
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
        
        if (existing) {
          existing.spend += req.perDiem.totalFJD;
        } else {
          monthlySpendMap.set(monthKey, {
            timestamp: monthStart,
            spend: req.perDiem.totalFJD
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
        acc[req.department] = (acc[req.department] || 0) + req.perDiem.totalFJD;
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

  const getStatusBadge = (status: TravelRequest['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'in_review':
        return <Badge variant="secondary">In Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTable = (filteredRequests: TravelRequest[]) => {
    if (filteredRequests.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No travel requests found
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
                  <TableHead className="text-right">Per Diem</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
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
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      FJD {request.perDiem.totalFJD.toFixed(2)}
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

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Travel Requests</h1>
          <p className="text-muted-foreground mt-1">Manage and track all travel requests</p>
        </div>
        <Link href="/request/new">
          <Button className="gap-2 h-12" data-testid="button-new-request">
            <Plus className="w-5 h-5" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Analytics Stats - Red & Blue Theme (WCAG 2.1 AA Compliant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Spend</p>
                <p className="text-3xl font-bold" data-testid="text-stat-total-spend">
                  FJD {stats.totalSpend.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900 dark:to-cyan-800 border-cyan-200 dark:border-cyan-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Per Diem</p>
                <p className="text-3xl font-bold" data-testid="text-stat-avg-perdiem">
                  FJD {stats.avgPerDiem.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Budget Utilization</p>
                <p className="text-3xl font-bold" data-testid="text-stat-budget-utilization">
                  {stats.budgetUtilization.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 border-red-200 dark:border-red-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Approvals</p>
                <p className="text-3xl font-bold" data-testid="text-stat-pending-approvals">{stats.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
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
