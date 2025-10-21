import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Calendar, MapPin, DollarSign } from "lucide-react";
import type { TravelRequest } from "@shared/types";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { generateTripSummaryPDF } from "@/utils/pdf";

export default function MyTrips() {
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "submitted" | "approved" | "rejected">("all");

  // Mock current user - in production this would come from auth
  const currentUserId = "employee";

  const { data: allRequests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Filter requests for current user
  const myRequests = allRequests.filter((req) => req.employeeId === currentUserId);

  const filteredRequests =
    statusFilter === "all"
      ? myRequests
      : myRequests.filter((req) => req.status === statusFilter);

  const stats = {
    total: myRequests.length,
    draft: myRequests.filter((r) => r.status === "draft").length,
    submitted: myRequests.filter((r) => r.status === "submitted" || r.status === "in_review").length,
    approved: myRequests.filter((r) => r.status === "approved").length,
    rejected: myRequests.filter((r) => r.status === "rejected").length,
  };

  const handleDownloadPDF = (request: TravelRequest) => {
    generateTripSummaryPDF(request);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading your trips...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Travel Requests</h1>
        <p className="text-muted-foreground">View and manage your travel history</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.submitted}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="submitted" data-testid="tab-pending">
            Pending ({stats.submitted})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({stats.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center text-muted-foreground">
                  No {statusFilter !== "all" && statusFilter} requests found
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => (
                <Card key={request.id} data-testid={`card-trip-${request.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {request.destination.city}
                        </CardTitle>
                        <CardDescription>{request.destination.country}</CardDescription>
                      </div>
                      <StatusBadge status={request.status} type="request" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {format(new Date(request.startDate), "MMM dd")} -{" "}
                        {format(new Date(request.endDate), "MMM dd, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        FJD {request.perDiem.totalFJD.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        ({request.perDiem.days} days)
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div className="line-clamp-2">{request.purpose}</div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => handleDownloadPDF(request)}
                        data-testid={`button-download-pdf-${request.id}`}
                      >
                        <Download className="w-4 h-4" />
                        Download Summary PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
