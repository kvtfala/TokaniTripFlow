import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, MapPin, Calendar, Building2, DollarSign } from "lucide-react";
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

  const TripCard = ({ trip }: { trip: Trip }) => (
    <Card
      className="hover-elevate"
      data-testid={`card-trip-${trip.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{trip.employeeName}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {trip.destination.city}, {trip.destination.country}
            </CardDescription>
          </div>
          {getStatusBadge(trip.tripStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {format(new Date(trip.startDate), 'dd MMM')} –{' '}
            {format(new Date(trip.endDate), 'dd MMM yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <span>{trip.department}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          <span>
            {trip.costCentre.code} • FJD {trip.perDiem.totalFJD.toFixed(2)}
          </span>
        </div>
        <Separator className="my-2" />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => generateTripSummaryPDF(trip)}
          data-testid={`button-pdf-${trip.id}`}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Itinerary
        </Button>
      </CardContent>
    </Card>
  );

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
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              In Progress ({displayedCurrent.length})
            </h2>
            {displayedCurrent.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No trips currently in progress
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {displayedCurrent.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Upcoming Trips */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              Upcoming (Next 30 Days) ({displayedUpcoming.length})
            </h2>
            {displayedUpcoming.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No upcoming trips in the next 30 days
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {displayedUpcoming.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
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
