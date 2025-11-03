import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Users, MapPin as MapPinIcon, DollarSign, Clock, AlertCircle, FileDown, TrendingUp, ArrowUpDown, TrendingDown, Building2, AlertTriangle, CheckCircle2, XCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useTripsNowAndUpcoming, type Trip } from "@/data/hooks";
import { format, differenceInDays, subDays, addDays } from "date-fns";
import { generateTripSummaryPDF } from "@/utils/pdf";
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts";

type SortField = "traveler" | "destination" | "startDate" | "department" | "perDiem";
type SortDirection = "asc" | "desc";

export default function TravelWatch() {
  const { current, upcoming, completed } = useTripsNowAndUpcoming();
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterCostCentre, setFilterCostCentre] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "current" | "completed">("all");
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const allTrips = [...current, ...upcoming, ...completed];

  // Extract unique values for filters
  const departments = Array.from(new Set(allTrips.map(t => t.department))).sort();
  const costCentres = Array.from(
    new Set(allTrips.map(t => t.costCentre.code))
  ).sort();

  // Apply search and filters with useMemo for performance
  const filteredTrips = useMemo(() => {
    let filtered = allTrips.filter((trip) => {
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

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortField) {
        case "traveler":
          compareValue = a.employeeName.localeCompare(b.employeeName);
          break;
        case "destination":
          compareValue = `${a.destination.city}`.localeCompare(`${b.destination.city}`);
          break;
        case "startDate":
          compareValue = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case "department":
          compareValue = a.department.localeCompare(b.department);
          break;
        case "perDiem":
          compareValue = a.perDiem.totalFJD - b.perDiem.totalFJD;
          break;
      }
      return sortDirection === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [allTrips, searchQuery, filterDepartment, filterCostCentre, filterStatus, sortField, sortDirection]);

  const displayedCurrent = filteredTrips.filter(t => t.tripStatus === 'current');
  const displayedUpcoming = filteredTrips.filter(t => t.tripStatus === 'upcoming');
  
  // Calculate summary statistics with trends
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    const activeTrips = [...current, ...upcoming];
    const previousPeriodTrips = allTrips.filter(t => {
      const start = new Date(t.startDate);
      return start >= sixtyDaysAgo && start < thirtyDaysAgo;
    });

    const uniqueDestinations = new Set(activeTrips.map(t => `${t.destination.city}, ${t.destination.country}`)).size;
    const previousDestinations = new Set(previousPeriodTrips.map(t => `${t.destination.city}, ${t.destination.country}`)).size;
    
    const totalPerDiem = activeTrips.reduce((sum, t) => sum + t.perDiem.totalFJD, 0);
    const previousPerDiem = previousPeriodTrips.reduce((sum, t) => sum + t.perDiem.totalFJD, 0);
    
    const avgDuration = activeTrips.length > 0
      ? activeTrips.reduce((sum, t) => sum + differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1, 0) / activeTrips.length
      : 0;
    const previousAvgDuration = previousPeriodTrips.length > 0
      ? previousPeriodTrips.reduce((sum, t) => sum + differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1, 0) / previousPeriodTrips.length
      : 0;
    
    return {
      activeTravelers: activeTrips.length,
      previousTravelers: previousPeriodTrips.length,
      travelersChange: previousPeriodTrips.length > 0 ? ((activeTrips.length - previousPeriodTrips.length) / previousPeriodTrips.length) * 100 : 0,
      uniqueDestinations,
      destinationsChange: previousDestinations > 0 ? ((uniqueDestinations - previousDestinations) / previousDestinations) * 100 : 0,
      totalPerDiem,
      perDiemChange: previousPerDiem > 0 ? ((totalPerDiem - previousPerDiem) / previousPerDiem) * 100 : 0,
      avgDuration,
      durationChange: previousAvgDuration > 0 ? ((avgDuration - previousAvgDuration) / previousAvgDuration) * 100 : 0,
    };
  }, [current, upcoming, allTrips]);
  
  // Find trips requiring attention (returning in next 3 days)
  const tripsRequiringAttention = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    return current.filter(trip => {
      const endDate = new Date(trip.endDate);
      return endDate >= now && endDate <= threeDaysFromNow;
    });
  }, [current]);

  // Find overdue expense reports (completed trips with no expense claim submitted - mock simulation)
  const overdueReports = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    
    // Simulate: Trips that completed more than 7 days ago without expense claims
    return completed.filter(trip => {
      const endDate = new Date(trip.endDate);
      return endDate < sevenDaysAgo;
    }).slice(0, 5); // Show max 5 for demo
  }, [completed]);

  // High value trips (per diem > FJD 5000)
  const highValueTrips = useMemo(() => {
    return [...current, ...upcoming].filter(trip => trip.perDiem.totalFJD > 5000);
  }, [current, upcoming]);

  // Visa compliance summary
  const visaCompliance = useMemo(() => {
    const activeTrips = [...current, ...upcoming];
    const totalWithVisa = activeTrips.filter(t => t.visaCheck).length;
    const visaOk = activeTrips.filter(t => t.visaCheck?.status === 'OK').length;
    const visaWarning = activeTrips.filter(t => t.visaCheck?.status === 'WARNING').length;
    const visaAction = activeTrips.filter(t => t.visaCheck?.status === 'ACTION').length;
    
    return {
      total: totalWithVisa,
      ok: visaOk,
      warning: visaWarning,
      action: visaAction,
      complianceRate: totalWithVisa > 0 ? (visaOk / totalWithVisa) * 100 : 100,
    };
  }, [current, upcoming]);

  // Aggregate trips by destination
  const destinationData = useMemo(() => {
    const activeTrips = [...current, ...upcoming];
    const destMap = new Map<string, {
      destination: string;
      city: string;
      country: string;
      currentCount: number;
      upcomingCount: number;
      totalPerDiem: number;
      latestReturn: Date | null;
      hasVisaWarning: boolean;
    }>();

    activeTrips.forEach(trip => {
      const key = `${trip.destination.city}, ${trip.destination.country}`;
      const existing = destMap.get(key);
      const endDate = new Date(trip.endDate);
      const hasWarning = trip.visaCheck?.status === 'WARNING' || trip.visaCheck?.status === 'ACTION';

      if (existing) {
        existing.currentCount += trip.tripStatus === 'current' ? 1 : 0;
        existing.upcomingCount += trip.tripStatus === 'upcoming' ? 1 : 0;
        existing.totalPerDiem += trip.perDiem.totalFJD;
        if (!existing.latestReturn || endDate > existing.latestReturn) {
          existing.latestReturn = endDate;
        }
        existing.hasVisaWarning = existing.hasVisaWarning || hasWarning;
      } else {
        destMap.set(key, {
          destination: key,
          city: trip.destination.city,
          country: trip.destination.country,
          currentCount: trip.tripStatus === 'current' ? 1 : 0,
          upcomingCount: trip.tripStatus === 'upcoming' ? 1 : 0,
          totalPerDiem: trip.perDiem.totalFJD,
          latestReturn: endDate,
          hasVisaWarning: hasWarning,
        });
      }
    });

    return Array.from(destMap.values()).sort((a, b) => 
      (b.currentCount + b.upcomingCount) - (a.currentCount + a.upcomingCount)
    );
  }, [current, upcoming]);

  // Department spend breakdown
  const departmentSpend = useMemo(() => {
    const activeTrips = [...current, ...upcoming];
    const deptMap = new Map<string, number>();

    activeTrips.forEach(trip => {
      const existing = deptMap.get(trip.department) || 0;
      deptMap.set(trip.department, existing + trip.perDiem.totalFJD);
    });

    return Array.from(deptMap.entries())
      .map(([dept, amount]) => ({ department: dept, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8); // Top 8 departments
  }, [current, upcoming]);

  // Travel trends over last 60 days
  const travelTrends = useMemo(() => {
    const now = new Date();
    const trends: { date: string; trips: number }[] = [];
    
    for (let i = 59; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'MMM dd');
      const tripsOnDay = allTrips.filter(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        return day >= start && day <= end;
      }).length;
      
      trends.push({ date: dayStr, trips: tripsOnDay });
    }
    
    return trends.filter((_, idx) => idx % 5 === 0); // Sample every 5 days for cleaner chart
  }, [allTrips]);

  // Top routes data for chart
  const topRoutesData = useMemo(() => {
    const routeMap = new Map<string, {
      route: string;
      current: number;
      upcoming: number;
      completed: number;
    }>();

    allTrips.forEach(trip => {
      const route = `${trip.destination.city}`;
      const existing = routeMap.get(route);

      if (existing) {
        if (trip.tripStatus === 'current') existing.current++;
        else if (trip.tripStatus === 'upcoming') existing.upcoming++;
        else existing.completed++;
      } else {
        routeMap.set(route, {
          route,
          current: trip.tripStatus === 'current' ? 1 : 0,
          upcoming: trip.tripStatus === 'upcoming' ? 1 : 0,
          completed: trip.tripStatus === 'completed' ? 1 : 0,
        });
      }
    });

    return Array.from(routeMap.values())
      .sort((a, b) => (b.current + b.upcoming + b.completed) - (a.current + a.upcoming + a.completed))
      .slice(0, 10);
  }, [allTrips]);

  // Visa status pie chart data
  const visaStatusData = [
    { name: 'Compliant', value: visaCompliance.ok, color: '#22c55e' },
    { name: 'Warning', value: visaCompliance.warning, color: '#f59e0b' },
    { name: 'Action Required', value: visaCompliance.action, color: '#ef4444' },
  ].filter(item => item.value > 0);
  
  // Export to CSV function with enhanced formatting
  const exportToCSV = () => {
    const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
    const metadata = [
      ["Tokani TripFlow - Travel Watch Export"],
      ["Generated:", format(new Date(), "dd MMM yyyy, HH:mm")],
      ["Total Records:", filteredTrips.length.toString()],
      ["Active Filters:", `Status: ${filterStatus}, Department: ${filterDepartment}, Cost Centre: ${filterCostCentre}`],
      ["Search Query:", searchQuery || "None"],
      [""],
    ];

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
      "Visa Status": trip.visaCheck?.status || 'N/A',
    }));

    const csvHeader = Papa.unparse(metadata);
    const csvData = Papa.unparse(exportData);
    const csv = csvHeader + "\n" + csvData;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `travel-watch_${timestamp}.csv`;
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

  const getTrendIcon = (change: number) => {
    if (change > 5) return <ArrowUp className="w-3 h-3 text-green-600" />;
    if (change < -5) return <ArrowDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 5) return "text-green-600";
    if (change < -5) return "text-red-600";
    return "text-gray-500";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDepartment("all");
    setFilterCostCentre("all");
    setFilterStatus("all");
  };

  const activeFilterCount = [
    searchQuery !== "",
    filterDepartment !== "all",
    filterCostCentre !== "all",
    filterStatus !== "all",
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" data-testid="heading-travel-watch">
            Travel Watch Dashboard
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live
            </span>
          </h1>
          <p className="text-muted-foreground">
            Real-time visibility of travelers, destinations, and trip status
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
          <FileDown className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats with Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-active-travelers" className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Travelers</p>
                <p className="text-2xl font-bold mb-1" data-testid="stat-active-travelers">{stats.activeTravelers}</p>
                <div className={`flex items-center gap-1 text-xs ${getTrendColor(stats.travelersChange)}`}>
                  {getTrendIcon(stats.travelersChange)}
                  <span>{Math.abs(stats.travelersChange).toFixed(1)}% vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-destinations" className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Destinations</p>
                <p className="text-2xl font-bold mb-1" data-testid="stat-destinations">{stats.uniqueDestinations}</p>
                <div className={`flex items-center gap-1 text-xs ${getTrendColor(stats.destinationsChange)}`}>
                  {getTrendIcon(stats.destinationsChange)}
                  <span>{Math.abs(stats.destinationsChange).toFixed(1)}% vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <MapPinIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-perdiem" className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Per Diem</p>
                <p className="text-2xl font-bold mb-1" data-testid="stat-total-perdiem">FJD {stats.totalPerDiem.toFixed(0)}</p>
                <div className={`flex items-center gap-1 text-xs ${getTrendColor(stats.perDiemChange)}`}>
                  {getTrendIcon(stats.perDiemChange)}
                  <span>{Math.abs(stats.perDiemChange).toFixed(1)}% vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-duration" className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Trip Duration</p>
                <p className="text-2xl font-bold mb-1" data-testid="stat-avg-duration">{stats.avgDuration.toFixed(1)} days</p>
                <div className={`flex items-center gap-1 text-xs ${getTrendColor(stats.durationChange)}`}>
                  {getTrendIcon(stats.durationChange)}
                  <span>{Math.abs(stats.durationChange).toFixed(1)}% vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="space-y-3 mb-6">
        {/* Trips Returning Soon */}
        {tripsRequiringAttention.length > 0 && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20" data-testid="alert-returning-soon">
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

        {/* Overdue Expense Reports */}
        {overdueReports.length > 0 && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20" data-testid="alert-overdue-reports">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-900 dark:text-red-200">
              <strong>{overdueReports.length}</strong> overdue expense report{overdueReports.length > 1 ? 's' : ''}: {' '}
              {overdueReports.slice(0, 3).map((trip, i) => (
                <span key={trip.id}>
                  {i > 0 && ', '}
                  {trip.employeeName} (due {differenceInDays(new Date(), new Date(trip.endDate))} days ago)
                </span>
              ))}
              {overdueReports.length > 3 && ` and ${overdueReports.length - 3} more`}
            </AlertDescription>
          </Alert>
        )}

        {/* High Value Trips */}
        {highValueTrips.length > 0 && (
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20" data-testid="alert-high-value">
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-200">
              <strong>{highValueTrips.length}</strong> high-value trip{highValueTrips.length > 1 ? 's' : ''} ({'>'}FJD 5,000):{' '}
              {highValueTrips.slice(0, 3).map((trip, i) => (
                <span key={trip.id}>
                  {i > 0 && ', '}
                  {trip.employeeName} to {trip.destination.city} (FJD {trip.perDiem.totalFJD.toFixed(0)})
                </span>
              ))}
              {highValueTrips.length > 3 && ` and ${highValueTrips.length - 3} more`}
            </AlertDescription>
          </Alert>
        )}

        {/* Visa Compliance Alert */}
        {visaCompliance.action > 0 && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20" data-testid="alert-visa-action">
            <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-900 dark:text-orange-200">
              <strong>{visaCompliance.action}</strong> trip{visaCompliance.action > 1 ? 's' : ''} require{visaCompliance.action === 1 ? 's' : ''} immediate visa action
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Search & Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Button>
            )}
          </div>
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

          {/* Quick Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4" data-testid="filter-chips">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {filterDepartment !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Dept: {filterDepartment}
                  <button onClick={() => setFilterDepartment("all")} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {filterCostCentre !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Cost Centre: {filterCostCentre}
                  <button onClick={() => setFilterCostCentre("all")} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filterStatus === 'current' ? 'In Progress' : filterStatus === 'upcoming' ? 'Upcoming' : 'Completed'}
                  <button onClick={() => setFilterStatus("all")} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Department Spend */}
        <Card data-testid="card-department-spend" className="hover-elevate">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Department Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentSpend.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentSpend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="department" 
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`FJD ${value.toFixed(0)}`, 'Spend']}
                    />
                    <Bar dataKey="amount" fill="#009BAA" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Travel Trends */}
        <Card data-testid="card-travel-trends" className="hover-elevate">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Travel Activity (60 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={travelTrends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    interval={2}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trips" 
                    stroke="#009BAA" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Visa Compliance */}
        <Card data-testid="card-visa-compliance" className="hover-elevate">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Visa Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold">{visaCompliance.complianceRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
              </div>
              {visaStatusData.length > 0 && (
                <div className="h-[100px] w-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visaStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {visaStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Compliant
                </span>
                <span className="font-semibold">{visaCompliance.ok}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  Warning
                </span>
                <span className="font-semibold">{visaCompliance.warning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  Action Required
                </span>
                <span className="font-semibold">{visaCompliance.action}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trip Lists */}
        <div className="space-y-6">
          {/* In Progress Trips */}
          <Card data-testid="card-in-progress-trips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
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
                          <TableHead 
                            className="cursor-pointer hover-elevate" 
                            onClick={() => handleSort('traveler')}
                          >
                            <div className="flex items-center gap-1">
                              Traveler
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('destination')}
                          >
                            <div className="flex items-center gap-1">
                              Destination
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('startDate')}
                          >
                            <div className="flex items-center gap-1">
                              Dates
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('department')}
                          >
                            <div className="flex items-center gap-1">
                              Department
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead className="text-right cursor-pointer hover-elevate"
                            onClick={() => handleSort('perDiem')}
                          >
                            <div className="flex items-center gap-1 justify-end">
                              Per Diem
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedCurrent.map((trip) => (
                          <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`} className="hover-elevate">
                            <TableCell className="font-medium">{trip.employeeName}</TableCell>
                            <TableCell>
                              {trip.destination.city}, {trip.destination.country}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{trip.department}</TableCell>
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
                      <div key={trip.id} className="p-4 border rounded-lg bg-card hover-elevate" data-testid={`card-trip-${trip.id}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{trip.employeeName}</p>
                            <p className="text-sm text-muted-foreground">{trip.department}</p>
                          </div>
                          <Badge className="bg-green-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5"></span>
                            In Progress
                          </Badge>
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
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('traveler')}
                          >
                            <div className="flex items-center gap-1">
                              Traveler
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('destination')}
                          >
                            <div className="flex items-center gap-1">
                              Destination
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('startDate')}
                          >
                            <div className="flex items-center gap-1">
                              Dates
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleSort('department')}
                          >
                            <div className="flex items-center gap-1">
                              Department
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead className="text-right cursor-pointer hover-elevate"
                            onClick={() => handleSort('perDiem')}
                          >
                            <div className="flex items-center gap-1 justify-end">
                              Per Diem
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedUpcoming.map((trip) => (
                          <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`} className="hover-elevate">
                            <TableCell className="font-medium">{trip.employeeName}</TableCell>
                            <TableCell>
                              {trip.destination.city}, {trip.destination.country}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(trip.startDate), 'dd MMM')} – {format(new Date(trip.endDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{trip.department}</TableCell>
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
                      <div key={trip.id} className="p-4 border rounded-lg bg-card hover-elevate" data-testid={`card-trip-${trip.id}`}>
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

        {/* Right: Destination Analytics */}
        <div className="space-y-6">
          {/* Destination Overview */}
          <Card data-testid="card-destination-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="w-5 h-5" />
                Destination Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {destinationData.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground" data-testid="empty-destinations">
                  No active destinations
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destination</TableHead>
                          <TableHead className="text-center">In Progress</TableHead>
                          <TableHead className="text-center">Upcoming</TableHead>
                          <TableHead className="text-right">Total Per Diem</TableHead>
                          <TableHead>Latest Return</TableHead>
                          <TableHead className="text-center">Flags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {destinationData.map((dest, idx) => (
                          <TableRow key={idx} data-testid={`row-destination-${idx}`} className="hover-elevate">
                            <TableCell className="font-medium">
                              <div>
                                <div>{dest.city}</div>
                                <div className="text-xs text-muted-foreground">{dest.country}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {dest.currentCount > 0 ? (
                                <Badge style={{ backgroundColor: '#009BAA' }} className="text-white">
                                  {dest.currentCount}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {dest.upcomingCount > 0 ? (
                                <Badge style={{ backgroundColor: '#EF6C57' }} className="text-white">
                                  {dest.upcomingCount}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              FJD {dest.totalPerDiem.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {dest.latestReturn ? format(dest.latestReturn, 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {dest.hasVisaWarning && (
                                <Badge variant="outline" className="border-amber-500 text-amber-700">
                                  Visa
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3 max-h-[400px] overflow-auto">
                    {destinationData.map((dest, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-card hover-elevate" data-testid={`card-destination-${idx}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{dest.city}</p>
                            <p className="text-sm text-muted-foreground">{dest.country}</p>
                          </div>
                          {dest.hasVisaWarning && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                              Visa
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground block mb-1">In Progress</span>
                            {dest.currentCount > 0 ? (
                              <Badge style={{ backgroundColor: '#009BAA' }} className="text-white">
                                {dest.currentCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Upcoming</span>
                            {dest.upcomingCount > 0 ? (
                              <Badge style={{ backgroundColor: '#EF6C57' }} className="text-white">
                                {dest.upcomingCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Per Diem</span>
                            <span className="font-semibold">FJD {dest.totalPerDiem.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Latest Return</span>
                            <span>{dest.latestReturn ? format(dest.latestReturn, 'dd MMM') : '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Top Destinations Chart */}
          <Card data-testid="card-destination-chart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top Destinations (All Trips)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topRoutesData.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No trip data available
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRoutesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="route" 
                        type="category" 
                        width={80}
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="current" 
                        name="In Progress" 
                        fill="#009BAA" 
                        stackId="a"
                      />
                      <Bar 
                        dataKey="upcoming" 
                        name="Upcoming" 
                        fill="#EF6C57" 
                        stackId="a"
                      />
                      <Bar 
                        dataKey="completed" 
                        name="Completed" 
                        fill="#94a3b8" 
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
