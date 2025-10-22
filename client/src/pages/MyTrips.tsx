import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import type { TravelRequest } from "@shared/types";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { generateTripSummaryPDF } from "@/utils/pdf";

export default function MyTrips() {
  const [tabFilter, setTabFilter] = useState<"upcoming" | "past" | "drafts">("upcoming");

  // Mock current user - in production this would come from auth
  const currentUserId = "employee";

  const { data: allRequests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Filter requests for current user
  const myRequests = allRequests.filter((req) => req.employeeId === currentUserId);

  const now = new Date();

  // Categorize trips by time and status
  const upcomingTrips = myRequests.filter(
    (r) => r.status === "approved" && new Date(r.endDate) >= now
  );
  const pastTrips = myRequests.filter(
    (r) => r.status === "approved" && new Date(r.endDate) < now
  );
  const draftTrips = myRequests.filter(
    (r) => r.status === "draft" || r.status === "submitted" || r.status === "in_review" || r.status === "rejected"
  );

  const filteredRequests =
    tabFilter === "upcoming"
      ? upcomingTrips
      : tabFilter === "past"
      ? pastTrips
      : draftTrips;

  const stats = {
    upcoming: upcomingTrips.length,
    past: pastTrips.length,
    drafts: draftTrips.length,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <div className="text-sm text-muted-foreground">Upcoming Trips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">{stats.past}</div>
            <div className="text-sm text-muted-foreground">Past Trips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.drafts}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming ({stats.upcoming})
          </TabsTrigger>
          <TabsTrigger value="past" data-testid="tab-past">
            Past ({stats.past})
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            In Progress ({stats.drafts})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tabFilter} className="mt-0">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No {tabFilter} trips found
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead>Travel Dates</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Per Diem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-trip-${request.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-destination-${request.id}`}>
                          {request.destination.city}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.destination.country}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-dates-${request.id}`}>
                          {format(new Date(request.startDate), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          to {format(new Date(request.endDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-duration-${request.id}`}>
                        {request.perDiem.days} days
                      </TableCell>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-perdiem-${request.id}`}>
                          FJD {request.perDiem.totalFJD.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} type="request" />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground" title={request.purpose}>
                          {request.purpose}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(request)}
                          data-testid={`button-download-pdf-${request.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
