import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { useTripsNowAndUpcoming, type Trip } from "@/data/hooks";
import { TravelMap } from "@/components/TravelMap";
import { format } from "date-fns";
import { generateTripSummaryPDF } from "@/utils/pdf";

export default function TravelWatch() {
  const { current, upcoming, completed } = useTripsNowAndUpcoming();
  
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterCostCentre, setFilterCostCentre] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "current" | "completed">("all");

  const allTrips = [...current, ...upcoming, ...completed];

  // Extract unique values for filters
  const departments = Array.from(new Set(allTrips.map(t => t.department))).sort();
  const costCentres = Array.from(
    new Set(allTrips.map(t => t.costCentre.code))
  ).sort();

  // Apply filters
  const filteredTrips = allTrips.filter((trip) => {
    if (filterDepartment !== "all" && trip.department !== filterDepartment) return false;
    if (filterCostCentre !== "all" && trip.costCentre.code !== filterCostCentre) return false;
    if (filterStatus !== "all" && trip.tripStatus !== filterStatus) return false;
    return true;
  });

  const displayedCurrent = filteredTrips.filter(t => t.tripStatus === 'current');
  const displayedUpcoming = filteredTrips.filter(t => t.tripStatus === 'upcoming');

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Travel Watch Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time visibility of travelers, destinations, and trip status
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                In Progress ({displayedCurrent.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayedCurrent.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No trips currently in progress
                </div>
              ) : (
                <div className="overflow-auto max-h-[400px]">
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
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                Upcoming (Next 30 Days) ({displayedUpcoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayedUpcoming.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No upcoming trips in the next 30 days
                </div>
              ) : (
                <div className="overflow-auto max-h-[400px]">
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
