import { useState, Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ChevronDown, ChevronUp, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { TravelRequest } from "@shared/types";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { generateTripSummaryPDF } from "@/utils/pdf";

type SortField = "date" | "cost" | "destination" | "status";
type SortOrder = "asc" | "desc";

export default function MyTrips() {
  const [tabFilter, setTabFilter] = useState<"upcoming" | "past" | "drafts">("upcoming");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMinCost, setFilterMinCost] = useState("");
  const [filterMaxCost, setFilterMaxCost] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const toggleRow = (requestId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRows(newExpanded);
  };

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

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterMinCost("");
    setFilterMaxCost("");
  };

  const hasActiveFilters = searchQuery || filterStartDate || filterEndDate || filterMinCost || filterMaxCost;

  // Apply search, filters, and sorting
  const processedRequests = useMemo(() => {
    let result = [...filteredRequests];

    // Apply search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(req =>
        req.destination.city.toLowerCase().includes(searchLower) ||
        req.destination.country.toLowerCase().includes(searchLower) ||
        req.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (filterStartDate) {
      result = result.filter(req => new Date(req.startDate) >= new Date(filterStartDate));
    }
    if (filterEndDate) {
      result = result.filter(req => new Date(req.startDate) <= new Date(filterEndDate));
    }

    // Apply cost range filter
    if (filterMinCost) {
      result = result.filter(req => {
        const cost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
        return cost >= parseFloat(filterMinCost);
      });
    }
    if (filterMaxCost) {
      result = result.filter(req => {
        const cost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
        return cost <= parseFloat(filterMaxCost);
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case "cost":
          const costA = a.costBreakdown?.totalCost || a.perDiem.totalFJD;
          const costB = b.costBreakdown?.totalCost || b.perDiem.totalFJD;
          comparison = costA - costB;
          break;
        case "destination":
          comparison = a.destination.city.localeCompare(b.destination.city);
          break;
        case "status":
          const statusOrder = { 
            draft: 1, 
            submitted: 2, 
            in_review: 3, 
            awaiting_quotes: 4,
            quotes_submitted: 5,
            approved: 6, 
            rejected: 7,
            ticketed: 8
          };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [filteredRequests, searchQuery, filterStartDate, filterEndDate, filterMinCost, filterMaxCost, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">My Travel Requests</h1>
          <p className="text-muted-foreground">View and manage your travel history</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Travel Requests</h1>
        <p className="text-muted-foreground">View and manage your travel history</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-primary" data-testid="stat-upcoming">{stats.upcoming}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">Upcoming Trips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-success" data-testid="stat-past">{stats.past}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">Past Trips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-warning" data-testid="stat-drafts">{stats.drafts}</div>
            <div className="text-sm font-semibold text-muted-foreground mt-1">In Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search destination or purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-trips"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
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
                    {[filterStartDate, filterEndDate, filterMinCost, filterMaxCost].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    data-testid="input-filter-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    data-testid="input-filter-end-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Cost (FJD)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filterMinCost}
                    onChange={(e) => setFilterMinCost(e.target.value)}
                    data-testid="input-filter-min-cost"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Cost (FJD)</label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={filterMaxCost}
                    onChange={(e) => setFilterMaxCost(e.target.value)}
                    data-testid="input-filter-max-cost"
                  />
                </div>
                {hasActiveFilters && (
                  <div className="lg:col-span-4 flex justify-end">
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
          {processedRequests.length === 0 ? (
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
                    <TableHead className="w-12"></TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 -ml-3 hover:bg-transparent"
                        onClick={() => toggleSort("destination")}
                      >
                        Destination
                        {getSortIcon("destination")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 -ml-3 hover:bg-transparent"
                        onClick={() => toggleSort("date")}
                      >
                        Travel Dates
                        {getSortIcon("date")}
                      </Button>
                    </TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 -ml-3 hover:bg-transparent"
                        onClick={() => toggleSort("cost")}
                      >
                        Total Cost
                        {getSortIcon("cost")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 -ml-3 hover:bg-transparent"
                        onClick={() => toggleSort("status")}
                      >
                        Status
                        {getSortIcon("status")}
                      </Button>
                    </TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => {
                    const isExpanded = expandedRows.has(request.id);
                    const breakdown = request.costBreakdown;
                    
                    return (
                      <Fragment key={request.id}>
                        <TableRow data-testid={`row-trip-${request.id}`}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRow(request.id)}
                              data-testid={`button-expand-${request.id}`}
                              aria-label={isExpanded ? "Hide cost breakdown" : "Show cost breakdown"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-primary" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-primary" />
                              )}
                            </Button>
                          </TableCell>
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
                            <div className="font-medium" data-testid={`text-totalcost-${request.id}`}>
                              FJD {breakdown ? breakdown.totalCost.toFixed(2) : request.perDiem.totalFJD.toFixed(2)}
                            </div>
                            {breakdown && (
                              <div className="text-xs text-[hsl(var(--lagoon))] font-medium">
                                {isExpanded ? '▲ Hide details' : '▼ View breakdown'}
                              </div>
                            )}
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
                        {breakdown && isExpanded && (
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={8}>
                              <div className="py-4 px-6">
                                <h4 className="font-semibold mb-3 text-sm">Cost Breakdown</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {breakdown.flights && (
                                    <div className="flex justify-between items-center p-3 bg-background rounded-md border" data-testid={`cost-flights-${request.id}`}>
                                      <span className="text-sm text-muted-foreground">Flights</span>
                                      <span className="font-medium">FJD {breakdown.flights.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {breakdown.accommodation && (
                                    <div className="flex justify-between items-center p-3 bg-background rounded-md border" data-testid={`cost-accommodation-${request.id}`}>
                                      <span className="text-sm text-muted-foreground">Accommodation</span>
                                      <span className="font-medium">FJD {breakdown.accommodation.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {breakdown.groundTransfers && (
                                    <div className="flex justify-between items-center p-3 bg-background rounded-md border" data-testid={`cost-transfers-${request.id}`}>
                                      <span className="text-sm text-muted-foreground">Ground Transfers</span>
                                      <span className="font-medium">FJD {breakdown.groundTransfers.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {breakdown.visaFees && (
                                    <div className="flex justify-between items-center p-3 bg-background rounded-md border" data-testid={`cost-visa-${request.id}`}>
                                      <span className="text-sm text-muted-foreground">Visa Fees</span>
                                      <span className="font-medium">FJD {breakdown.visaFees.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center p-3 bg-background rounded-md border" data-testid={`cost-perdiem-${request.id}`}>
                                    <span className="text-sm text-muted-foreground">Per Diem ({request.perDiem.days} days)</span>
                                    <span className="font-medium">FJD {breakdown.perDiem.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-md border border-primary/20" data-testid={`cost-total-${request.id}`}>
                                    <span className="text-sm font-semibold">Total Cost</span>
                                    <span className="font-bold text-primary">FJD {breakdown.totalCost.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
