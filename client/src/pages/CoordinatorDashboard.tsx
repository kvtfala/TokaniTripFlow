import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import type { TravelRequest, RequestStatus } from "@shared/types";
import { useRole } from "@/contexts/RoleContext";

export default function CoordinatorDashboard() {
  const { currentUser } = useRole();
  
  // TODO: Production - Add proper authentication and authorization
  // For demo: Allow coordinator and manager roles
  if (currentUser.role !== "coordinator" && currentUser.role !== "manager") {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <ShieldAlert className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <strong>Access Denied:</strong> This page is only accessible to coordinators and managers. 
            Your current role is "{currentUser.role}".
          </AlertDescription>
        </Alert>
        <Link href="/">
          <Button className="mt-4">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  // Fetch all requests - in production, filter by coordinator's submissions
  const { data: requests = [], isLoading } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = 
      searchQuery === "" ||
      req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.destination.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Quick stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "submitted" || r.status === "in_review").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<RequestStatus, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      submitted: { variant: "outline", label: "Submitted" },
      in_review: { variant: "default", label: "In Review" },
      awaiting_quotes: { variant: "outline", label: "Awaiting Quotes" },
      quotes_submitted: { variant: "default", label: "Quotes Submitted" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      ticketed: { variant: "default", label: "Ticketed" },
    };
    return variants[status];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bula! Travel Coordinator</h1>
          <p className="text-muted-foreground mt-1">
            Manage travel requests for your team
          </p>
        </div>
        <Link href="/request/new">
          <Button size="lg" variant="secondary" data-testid="button-new-request">
            <Plus className="w-5 h-5 mr-2" />
            New Travel Request
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-3xl font-bold" data-testid="stat-pending">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-3xl font-bold" data-testid="stat-approved">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-3xl font-bold" data-testid="stat-rejected">{stats.rejected}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle>Travel Requests</CardTitle>
          <CardDescription>View and manage all submitted travel requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by traveller, destination, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-requests"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RequestStatus | "all")}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="ticketed">Ticketed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No requests found. {searchQuery || statusFilter !== "all" ? "Try adjusting your filters." : "Create your first travel request!"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover-elevate" data-testid={`request-card-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Request details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{request.employeeName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {request.position} · {request.department}
                            </p>
                          </div>
                          <Badge {...getStatusBadge(request.status)} data-testid={`badge-status-${request.id}`}>
                            {getStatusBadge(request.status).label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{request.destination.city}, {request.destination.country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {format(new Date(request.startDate), "MMM dd")} - {format(new Date(request.endDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span>FJD {request.perDiem.totalFJD.toFixed(2)} per diem</span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {request.purpose}
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col gap-2">
                        <Link href={`/requests/${request.id}`}>
                          <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-${request.id}`}>
                            <Eye className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">View Details</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
