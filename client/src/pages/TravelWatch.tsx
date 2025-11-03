import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Users, MapPin as MapPinIcon, DollarSign, Clock, AlertCircle, FileDown } from "lucide-react";
import { useTripsNowAndUpcoming, type Trip } from "@/data/hooks";
import { TravelMap } from "@/components/TravelMap";
import { format, differenceInDays } from "date-fns";
import { generateTripSummaryPDF } from "@/utils/pdf";
import Papa from "papaparse";

export default function TravelWatch() {
  const { current, upcoming, completed } = useTripsNowAndUpcoming();
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterCostCentre, setFilterCostCentre] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "current" | "completed">("all");

  const allTrips = [...current, ...upcoming, ...completed];

  // Extract unique values for filters
  const departments = Array.from(new Set(allTrips.map(t => t.department))).sort();
  const costCentres = Array.from(
    new Set(allTrips.map(t => t.costCentre.code))
  ).sort();

  // Apply search and filters with useMemo for performance
  const filteredTrips = useMemo(() => {
    return allTrips.filter((trip) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          trip.employeeName.toLowerCase().includes(query) ||
          trip.destination.city.toLowerCase().includes(query) ||
          trip.destination.country.toLowerCase().includes(query) ||
          trip.department.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Department filter
      if (filterDepartment !== "all" && trip.department !== filterDepartment) return false;
      
      // Cost centre filter
      if (filterCostCentre !== "all" && trip.costCentre.code !== filterCostCentre) return false;
      
      // Status filter
      if (filterStatus !== "all" && trip.tripStatus !== filterStatus) return false;
      
      return true;
    });
  }, [allTrips, searchQuery, filterDepartment, filterCostCentre, filterStatus]);

  const displayedCurrent = filteredTrips.filter(t => t.tripStatus === 'current');
  const displayedUpcoming = filteredTrips.filter(t => t.tripStatus === 'upcoming');
  
  // Calculate summary statistics
  const stats = useMemo(() => {
    const activeTrips = [...current, ...upcoming];
    const uniqueDestinations = new Set(activeTrips.map(t => `${t.destination.city}, ${t.destination.country}`)).size;
    const totalPerDiem = activeTrips.reduce((sum, t) => sum + t.perDiem.totalFJD, 0);
    const avgDuration = activeTrips.length > 0
      ? activeTrips.reduce((sum, t) => sum + differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1, 0) / activeTrips.length
      : 0;
    
    return {
      activeTravelers: activeTrips.length,
      uniqueDestinations,
      totalPerDiem,
      avgDuration,
    };
  }, [current, upcoming]);
  
  // Find trips requiring attention (returning in next 3 days)
  const tripsRequiringAttention = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    return current.filter(trip => {
      const endDate = new Date(trip.endDate);
      return endDate >= now && endDate <= threeDaysFromNow;
    });
  }, [current]);
  
  // Export to CSV function
  const exportToCSV = () => {
    const exportData = filteredTrips.map((trip) => ({
      "Employee": trip.employeeName,
      "Destination": `${trip.destination.city}, ${trip.destination.country}`,
      "Start Date": format(new Date(trip.startDate), "dd/MM/yyyy"),
      "End Date": format(new Date(trip.endDate), "dd/MM/yyyy"),
      "Duration (days)": differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1,
      "Department": trip.department,
      "Cost Centre": trip.costCentre.code,
      "Per Diem (FJD)": trip.perDiem.totalFJD.toFixed(2),
      "Status": trip.tripStatus === 'current' ? 'In Progress' : trip.tripStatus === 'upcoming' ? 'Upcoming' : 'Completed',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `travel-watch-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const getStatusBadge = (status: Trip['tripStatus']) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-green-500">In Progress</Badge>;
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-travel-watch">Travel Watch Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time visibility of travelers, destinations, and trip status
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
          <FileDown className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-active-travelers">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Travelers</p>
                <p className="text-2xl font-bold" data-testid="stat-active-travelers">{stats.activeTravelers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-destinations">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Destinations</p>
                <p className="text-2xl font-bold" data-testid="stat-destinations">{stats.uniqueDestinations}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <MapPinIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-perdiem">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Per Diem</p>
                <p className="text-2xl font-bold" data-testid="stat-total-perdiem">FJD {stats.totalPerDiem.toFixed(0)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-duration">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Trip Duration</p>
                <p className="text-2xl font-bold" data-testid="stat-avg-duration">{stats.avgDuration.toFixed(1)} days</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section - Trips Returning Soon */}
      {tripsRequiringAttention.length > 0 && (
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20" data-testid="alert-returning-soon">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-200">
            <strong>{tripsRequiringAttention.length}</strong> traveler{tripsRequiringAttention.length > 1 ? 's' : ''} returning in the next 3 days:{' '}
            {tripsRequiringAttention.map((trip, i) => (
              <span key={trip.id}>
                {i > 0 && ', '}
                {trip.employeeName} (returns {format(new Date(trip.endDate), 'dd MMM')})
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search-travelers">Search</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search-travelers"
                  type="text"
                  placeholder="Traveler, destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-travelers"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div>
              <Label htmlFor="filter-department">Department</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger id="filter-department" className="mt-2" data-testid="select-department">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Centre Filter */}
            <div>
              <Label htmlFor="filter-cost-centre">Cost Centre</Label>
              <Select value={filterCostCentre} onValueChange={setFilterCostCentre}>
                <SelectTrigger id="filter-cost-centre" className="mt-2" data-testid="select-cost-centre">
                  <SelectValue placeholder="All cost centres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cost Centres</SelectItem>
                  {costCentres.map((cc) => (
                    <SelectItem key={cc} value={cc}>
                      {cc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger id="filter-status" className="mt-2" data-testid="select-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Show All</SelectItem>
                  <SelectItem value="current">In Progress</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trip Lists */}
        <div className="space-y-6">
          {/* In Progress Trips */}
          <Card data-testid="card-in-progress-trips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                In Progress ({displayedCurrent.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayedCurrent.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground" data-testid="empty-in-progress">
                  No trips currently in progress
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Traveler</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Cost Centre</TableHead>
                          <TableHead className="text-right">Per Diem</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedCurrent.map((trip) => (
                          <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                            <TableCell className="font-medium">{trip.employeeName}</TableCell>
                            <TableCell>
                              {trip.destination.city}, {trip.destination.country}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{trip.department}</TableCell>
                            <TableCell>{trip.costCentre.code}</TableCell>
                            <TableCell className="text-right">
                              FJD {trip.perDiem.totalFJD.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateTripSummaryPDF(trip)}
                                data-testid={`button-pdf-${trip.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3 max-h-[400px] overflow-auto">
                    {displayedCurrent.map((trip) => (
                      <div key={trip.id} className="p-4 border rounded-lg bg-card" data-testid={`card-trip-${trip.id}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{trip.employeeName}</p>
                            <p className="text-sm text-muted-foreground">{trip.department}</p>
                          </div>
                          <Badge className="bg-green-500">In Progress</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Destination:</span>
                            <span className="font-medium">{trip.destination.city}, {trip.destination.country}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dates:</span>
                            <span>{format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost Centre:</span>
                            <span>{trip.costCentre.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Per Diem:</span>
                            <span className="font-semibold">FJD {trip.perDiem.totalFJD.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => generateTripSummaryPDF(trip)}
                          data-testid={`button-pdf-mobile-${trip.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <Card data-testid="card-upcoming-trips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                Upcoming (Next 30 Days) ({displayedUpcoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayedUpcoming.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground" data-testid="empty-upcoming">
                  No upcoming trips in the next 30 days
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Traveler</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Cost Centre</TableHead>
                          <TableHead className="text-right">Per Diem</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedUpcoming.map((trip) => (
                          <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                            <TableCell className="font-medium">{trip.employeeName}</TableCell>
                            <TableCell>
                              {trip.destination.city}, {trip.destination.country}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{trip.department}</TableCell>
                            <TableCell>{trip.costCentre.code}</TableCell>
                            <TableCell className="text-right">
                              FJD {trip.perDiem.totalFJD.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generateTripSummaryPDF(trip)}
                                data-testid={`button-pdf-${trip.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3 max-h-[400px] overflow-auto">
                    {displayedUpcoming.map((trip) => (
                      <div key={trip.id} className="p-4 border rounded-lg bg-card" data-testid={`card-trip-${trip.id}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{trip.employeeName}</p>
                            <p className="text-sm text-muted-foreground">{trip.department}</p>
                          </div>
                          <Badge variant="secondary">Upcoming</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Destination:</span>
                            <span className="font-medium">{trip.destination.city}, {trip.destination.country}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dates:</span>
                            <span>{format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost Centre:</span>
                            <span>{trip.costCentre.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Per Diem:</span>
                            <span className="font-semibold">FJD {trip.perDiem.totalFJD.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => generateTripSummaryPDF(trip)}
                          data-testid={`button-pdf-mobile-${trip.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Map */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Trips Map</h2>
          <TravelMap trips={[...displayedCurrent, ...displayedUpcoming]} />
        </div>
      </div>
    </div>
  );
}
