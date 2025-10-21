import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, MapPin, Clock } from "lucide-react";
import type { TravelRequest } from "@shared/types";

export default function Analytics() {
  const { data: requests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const approvedRequests = requests.filter((r) => r.status === "approved");

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
      byCC[key] = (byCC[key] || 0) + r.perDiem.totalFJD;
    });

    return Object.entries(byCC)
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => b.total - a.total);
  })();

  // Top destinations
  const topDestinations = (() => {
    const byCityCountry: Record<string, number> = {};
    requests.forEach((r) => {
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

  const totalSpend = approvedRequests.reduce((sum, r) => sum + r.perDiem.totalFJD, 0);

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Travel request insights and key performance indicators
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Total Spend</div>
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-primary">
              FJD {totalSpend.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {approvedRequests.length} approved requests
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Avg Approval Time</div>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {avgApprovalTime.toFixed(1)} days
            </div>
            <div className="text-xs text-muted-foreground mt-1">
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
