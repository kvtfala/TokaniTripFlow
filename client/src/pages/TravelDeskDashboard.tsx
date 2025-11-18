import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search,
  Plane,
  Hotel,
  FileText,
  Clock,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Briefcase
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { TravelRequest } from "@shared/types";
import { useRole } from "@/contexts/RoleContext";

export default function TravelDeskDashboard() {
  const { currentUser, hasRole } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  
  // TODO: Production - Add proper authentication and authorization
  // For demo: Allow travel_admin role only
  if (!hasRole(["travel_admin", "manager"])) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <ShieldAlert className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <strong>Access Denied:</strong> This page is only accessible to Travel Desk staff. 
            Your current role is "{currentUser.role}".
          </AlertDescription>
        </Alert>
        <Link href="/">
          <Button className="mt-4">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Fetch all requests
  const { data: allRequests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Filter approved requests ready for processing
  const processingQueue = allRequests.filter(req => req.status === "approved");

  // Apply search filter
  const filteredQueue = processingQueue.filter((req) => {
    if (searchQuery === "") return true;
    const query = searchQuery.toLowerCase();
    return (
      req.employeeName.toLowerCase().includes(query) ||
      req.destination.city.toLowerCase().includes(query) ||
      req.destination.country.toLowerCase().includes(query) ||
      req.id.toLowerCase().includes(query) ||
      req.department.toLowerCase().includes(query)
    );
  });

  // Calculate urgency for each request
  const enrichedQueue = filteredQueue.map(req => {
    const daysUntilDeparture = differenceInDays(new Date(req.startDate), new Date());
    const urgency = daysUntilDeparture <= 3 ? "critical" : 
                   daysUntilDeparture <= 7 ? "high" : 
                   daysUntilDeparture <= 14 ? "medium" : "low";
    return { ...req, daysUntilDeparture, urgency };
  });

  // Sort by urgency (soonest departure first)
  const sortedQueue = enrichedQueue.sort((a, b) => a.daysUntilDeparture - b.daysUntilDeparture);

  // Calculate stats
  const stats = {
    total: processingQueue.length,
    critical: enrichedQueue.filter(r => r.urgency === "critical").length,
    needVisa: processingQueue.filter(r => r.needsVisa).length,
    needAccommodation: processingQueue.filter(r => r.needsAccommodation).length,
  };

  const getUrgencyBadge = (urgency: string, days: number) => {
    if (urgency === "critical") {
      return <Badge variant="destructive" data-testid={`badge-urgency-critical`}>URGENT - {days}d</Badge>;
    }
    if (urgency === "high") {
      return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700" data-testid={`badge-urgency-high`}>High Priority - {days}d</Badge>;
    }
    if (urgency === "medium") {
      return <Badge variant="secondary" data-testid={`badge-urgency-medium`}>Medium - {days}d</Badge>;
    }
    return <Badge variant="outline" data-testid={`badge-urgency-low`}>{days} days</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading processing queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-travel-desk">
          Bula! Travel Desk
        </h1>
        <p className="text-muted-foreground">
          Manage approved travel requests and coordinate bookings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-queue">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-critical">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Departure ≤3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visa Processing</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-visa">{stats.needVisa}</div>
            <p className="text-xs text-muted-foreground">Visa required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accommodation</CardTitle>
            <Hotel className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-accommodation">{stats.needAccommodation}</div>
            <p className="text-xs text-muted-foreground">Booking needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alert Banner */}
      {stats.critical > 0 && (
        <Alert variant="destructive" data-testid="alert-critical-departures">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <strong>Critical:</strong> {stats.critical} request{stats.critical > 1 ? 's' : ''} with departure within 3 days require immediate processing!
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
          <CardDescription>Search and manage approved travel requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by traveller, destination, or request ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-queue"
            />
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      {sortedQueue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? "No requests match your search" : "No approved requests in queue"}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery("")}
                className="mt-4"
                data-testid="button-clear-search"
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedQueue.map((request) => (
            <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg" data-testid={`text-traveller-${request.id}`}>
                        {request.employeeName}
                      </CardTitle>
                      {getUrgencyBadge(request.urgency, request.daysUntilDeparture)}
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {request.position} • {request.department}
                    </CardDescription>
                  </div>
                  <Link href={`/requests/${request.id}`}>
                    <Button variant="default" size="sm" data-testid={`button-process-${request.id}`}>
                      Process Request
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trip Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Destination:</span>
                      <span data-testid={`text-destination-${request.id}`}>
                        {request.destination.city}, {request.destination.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Departure:</span>
                      <span data-testid={`text-departure-${request.id}`}>
                        {format(new Date(request.startDate), "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Return:</span>
                      <span data-testid={`text-return-${request.id}`}>
                        {format(new Date(request.endDate), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Services Needed */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Services Required:</p>
                    <div className="flex flex-wrap gap-2">
                      {request.needsFlights && (
                        <Badge variant="secondary" data-testid={`badge-flight-${request.id}`}>
                          <Plane className="w-3 h-3 mr-1" />
                          Flight
                        </Badge>
                      )}
                      {request.needsAccommodation && (
                        <Badge variant="secondary" data-testid={`badge-accommodation-${request.id}`}>
                          <Hotel className="w-3 h-3 mr-1" />
                          Accommodation
                        </Badge>
                      )}
                      {request.needsVisa && (
                        <Badge variant="secondary" data-testid={`badge-visa-${request.id}`}>
                          <FileText className="w-3 h-3 mr-1" />
                          Visa
                        </Badge>
                      )}
                      {!request.needsFlights && !request.needsAccommodation && !request.needsVisa && (
                        <span className="text-sm text-muted-foreground">No special services</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                <div className="text-sm">
                  <span className="font-medium">Purpose:</span>{" "}
                  <span className="text-muted-foreground" data-testid={`text-purpose-${request.id}`}>
                    {request.purpose}
                  </span>
                </div>

                {/* Request ID */}
                <div className="text-xs text-muted-foreground">
                  Request ID: {request.id}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
