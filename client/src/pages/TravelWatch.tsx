import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Users, MapPin, PlaneTakeoff, PlaneLanding, ShieldAlert, ShieldCheck,
  AlertCircle, AlertTriangle, Phone, User, Calendar, Clock,
  RefreshCw, Download, FileDown, ExternalLink, Thermometer,
  Zap, Waves, Wind, CloudRain, Sun, Cloud, Eye, Activity,
  CheckCircle2, XCircle, Info, ChevronRight, Wifi
} from "lucide-react";
import { useTripsNowAndUpcoming, type Trip } from "@/data/hooks";
import { format, differenceInDays, addDays, subDays, isWithinInterval } from "date-fns";
import Papa from "papaparse";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── ISO numeric → country name for world-atlas TopoJSON ──────────────────────
const ISO_NUM_TO_NAME: Record<number, string> = {
  36: "Australia", 554: "New Zealand", 242: "Fiji", 882: "Samoa",
  776: "Tonga", 548: "Vanuatu", 90: "Solomon Islands", 598: "Papua New Guinea",
  360: "Indonesia", 608: "Philippines", 702: "Singapore", 392: "Japan",
  764: "Thailand", 356: "India", 156: "China", 344: "Hong Kong",
  840: "United States", 826: "United Kingdom", 784: "United Arab Emirates",
  458: "Malaysia", 410: "South Korea", 104: "Myanmar", 643: "Russia",
  804: "Ukraine", 408: "North Korea", 4: "Afghanistan", 364: "Iran",
  250: "France", 276: "Germany", 124: "Canada", 586: "Pakistan",
  566: "Nigeria", 706: "Somalia", 736: "Sudan", 760: "Syria",
  887: "Yemen", 434: "Libya",
};

// ── Destination lat/lng for markers and weather ───────────────────────────────
const DEST_COORDS: Record<string, { lat: number; lng: number; countryCapital?: boolean }> = {
  "Sydney":       { lat: -33.87,  lng: 151.21  },
  "Melbourne":    { lat: -37.81,  lng: 144.96  },
  "Brisbane":     { lat: -27.47,  lng: 153.02  },
  "Perth":        { lat: -31.95,  lng: 115.86  },
  "Auckland":     { lat: -36.84,  lng: 174.77  },
  "Wellington":   { lat: -41.29,  lng: 174.78  },
  "Nadi":         { lat: -17.77,  lng: 177.44  },
  "Suva":         { lat: -18.14,  lng: 178.44  },
  "Singapore":    { lat: 1.35,    lng: 103.82  },
  "Apia":         { lat: -13.83,  lng: -172.13 },
  "Honiara":      { lat: -9.43,   lng: 160.03  },
  "Port Moresby": { lat: -9.44,   lng: 147.18  },
  "Port Vila":    { lat: -17.73,  lng: 168.32  },
  "Nukualofa":    { lat: -21.14,  lng: -175.20 },
  "Tokyo":        { lat: 35.69,   lng: 139.69  },
  "Bangkok":      { lat: 13.75,   lng: 100.52  },
  "Jakarta":      { lat: -6.21,   lng: 106.85  },
  "Manila":       { lat: 14.60,   lng: 120.98  },
  "Kuala Lumpur": { lat: 3.15,    lng: 101.69  },
  "Dubai":        { lat: 25.20,   lng: 55.27   },
  "London":       { lat: 51.51,   lng: -0.13   },
  "New York":     { lat: 40.71,   lng: -74.01  },
  "Los Angeles":  { lat: 34.05,   lng: -118.24 },
  "Honolulu":     { lat: 21.31,   lng: -157.86 },
};

// ── WMO weather codes → description + icon ───────────────────────────────────
function getWeatherInfo(code: number): { desc: string; Icon: typeof Sun } {
  if (code === 0) return { desc: "Clear", Icon: Sun };
  if (code <= 3) return { desc: "Partly Cloudy", Icon: Cloud };
  if (code <= 48) return { desc: "Foggy", Icon: Cloud };
  if (code <= 67) return { desc: "Rain", Icon: CloudRain };
  if (code <= 77) return { desc: "Snow", Icon: Cloud };
  if (code <= 82) return { desc: "Showers", Icon: CloudRain };
  if (code <= 86) return { desc: "Snow Showers", Icon: Cloud };
  return { desc: "Thunderstorm", Icon: Zap };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface GdacsEvent {
  id: string; title: string; description: string;
  alertLevel: "Green" | "Orange" | "Red";
  eventType: string; country: string; lat: number; lng: number;
  publishedAt: string;
}
interface Advisory {
  level: 1 | 2 | 3 | 4; name: string; summary: string;
}
interface ThreatFeedData {
  events: GdacsEvent[]; cachedAt: string; cached: boolean; error?: string;
}
interface AdvisoryData {
  advisories: Record<string, Advisory>;
  source: string; lastReviewed: string; disclaimer: string;
}
interface WeatherData {
  current_weather: { temperature: number; weathercode: number; windspeed: number };
}

// ── Advisory level helpers ────────────────────────────────────────────────────
const ADVISORY_LABEL: Record<number, string> = {
  1: "Normal", 2: "High Caution", 3: "Reconsider", 4: "Do Not Travel",
};
const ADVISORY_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  2: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  3: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  4: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};
const ADVISORY_MAP_FILL: Record<number, string> = {
  1: "hsl(142 60% 50% / 0.15)",
  2: "hsl(45 90% 55% / 0.25)",
  3: "hsl(25 90% 55% / 0.30)",
  4: "hsl(0 80% 55% / 0.35)",
};

// ── GDACS event type helpers ──────────────────────────────────────────────────
const EVENT_TYPE_LABEL: Record<string, string> = {
  EQ: "Earthquake", FL: "Flood", TC: "Tropical Cyclone",
  DR: "Drought", WF: "Wildfire", VO: "Volcano", TS: "Tsunami",
};
const ALERT_COLORS: Record<string, string> = {
  Green: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300",
  Orange: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300",
  Red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300",
};

// ── Weather mini-widget ───────────────────────────────────────────────────────
function WeatherWidget({ city }: { city: string }) {
  const coords = DEST_COORDS[city];
  const { data } = useQuery<WeatherData>({
    queryKey: ["weather", city],
    queryFn: async () => {
      if (!coords) return null;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&forecast_days=1&timezone=auto`;
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!coords,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  if (!data?.current_weather) return null;
  const { temperature, weathercode } = data.current_weather;
  const { desc, Icon } = getWeatherInfo(weathercode);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3 h-3" />
      {temperature.toFixed(0)}°C {desc}
    </span>
  );
}

// ── Traveler welfare card ─────────────────────────────────────────────────────
function TravelerCard({
  trip, advisories, gdacsEvents, onClick,
}: {
  trip: Trip;
  advisories: Record<string, Advisory>;
  gdacsEvents: GdacsEvent[];
  onClick?: () => void;
}) {
  const now = new Date();
  const endDate = new Date(trip.endDate);
  const startDate = new Date(trip.startDate);
  const daysLeft = differenceInDays(endDate, now);
  const durationDays = differenceInDays(endDate, startDate) + 1;
  const isReturningVSoon = daysLeft <= 1;
  const isReturningSoon = daysLeft <= 3;
  const isLongTrip = durationDays > 14;
  const missingContact = !trip.emergencyContactName;
  const visaAction = trip.visaCheck?.status === "ACTION";
  const advisory = advisories[trip.destination.country];
  const highAdvisory = advisory && advisory.level >= 3;
  const destGdacs = gdacsEvents.filter(
    e => e.country.toLowerCase() === trip.destination.country.toLowerCase() && e.alertLevel !== "Green"
  );

  const hasFlag = missingContact || visaAction || isReturningVSoon || highAdvisory || destGdacs.length > 0;
  const borderColor = hasFlag
    ? "border-l-red-500"
    : isReturningSoon
    ? "border-l-amber-500"
    : "border-l-green-500";

  return (
    <Card
      className={`border-l-4 ${borderColor} cursor-pointer`}
      onClick={onClick}
      data-testid={`card-traveler-${trip.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-sm">{trip.employeeName}</p>
            <p className="text-xs text-muted-foreground">{trip.position} · {trip.department}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {trip.tripStatus === "current" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {daysLeft === 0 ? "Returns today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
              </span>
            )}
            {trip.tripStatus === "upcoming" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                <PlaneTakeoff className="w-3 h-3" />
                Departing {format(new Date(trip.startDate), "d MMM")}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{trip.destination.city}, {trip.destination.country}</span>
            {advisory && advisory.level >= 2 && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${ADVISORY_COLOR[advisory.level]}`}>
                L{advisory.level}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{format(new Date(trip.startDate), "d MMM")} – {format(new Date(trip.endDate), "d MMM yyyy")}</span>
            {isLongTrip && (
              <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 dark:text-blue-300 ml-1">
                {durationDays}d trip
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <WeatherWidget city={trip.destination.city} />
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          {trip.emergencyContactName ? (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">{trip.emergencyContactName}</span>
                <span className="text-muted-foreground ml-1">{trip.emergencyContactPhone}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">No emergency contact on file</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            {trip.visaCheck?.status === "OK" && (
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Visa clear
              </span>
            )}
            {trip.visaCheck?.status === "WARNING" && (
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" /> Visa warning
              </span>
            )}
            {trip.visaCheck?.status === "ACTION" && (
              <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                <XCircle className="w-3 h-3" /> Visa action required
              </span>
            )}
            <span className="text-muted-foreground ml-auto">{trip.ttrNumber}</span>
          </div>

          {destGdacs.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
              <Activity className="w-3 h-3 shrink-0" />
              <span>Active GDACS {destGdacs[0].alertLevel} alert in {trip.destination.country}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── GDACS Threat Feed panel ───────────────────────────────────────────────────
// Pacific region countries for regional tier
const PACIFIC_REGION_LOWER = new Set([
  "fiji", "samoa", "tonga", "vanuatu", "solomon islands", "papua new guinea",
  "new caledonia", "kiribati", "tuvalu", "nauru", "palau", "marshall islands",
  "micronesia", "cook islands", "niue", "french polynesia", "new zealand",
  "australia", "indonesia", "philippines", "timor-leste",
]);

function ThreatFeedPanel({
  events, cachedAt, cached, isLoading, isError, onRefresh, travelerCountries,
}: {
  events: GdacsEvent[];
  cachedAt?: string;
  cached?: boolean;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  travelerCountries: Set<string>;
}) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "EQ": return <Activity className="w-4 h-4" />;
      case "FL": return <Waves className="w-4 h-4" />;
      case "TC": return <Wind className="w-4 h-4" />;
      case "WF": return <Zap className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Sort into three priority tiers
  const { travelerEvents, regionalEvents, globalEvents } = useMemo(() => {
    const travelerEvents: GdacsEvent[] = [];
    const regionalEvents: GdacsEvent[] = [];
    const globalEvents: GdacsEvent[] = [];
    events.forEach(e => {
      const c = e.country.toLowerCase();
      if (travelerCountries.has(c)) {
        travelerEvents.push(e);
      } else if (PACIFIC_REGION_LOWER.has(c)) {
        regionalEvents.push(e);
      } else {
        globalEvents.push(e);
      }
    });
    // Within each tier: Red first, then Orange, then Green
    const sortByAlert = (a: GdacsEvent, b: GdacsEvent) => {
      const order: Record<string, number> = { Red: 0, Orange: 1, Green: 2 };
      return (order[a.alertLevel] ?? 2) - (order[b.alertLevel] ?? 2);
    };
    return {
      travelerEvents: travelerEvents.sort(sortByAlert),
      regionalEvents: regionalEvents.sort(sortByAlert),
      globalEvents: globalEvents.sort(sortByAlert),
    };
  }, [events, travelerCountries]);

  const renderEvent = (event: GdacsEvent, isTravelerDest: boolean) => (
    <div
      key={event.id}
      className={`px-4 py-3 text-sm ${
        event.alertLevel === "Red" ? "border-l-4 border-l-red-500" :
        event.alertLevel === "Orange" ? "border-l-4 border-l-amber-500" : "pl-4"
      }`}
      data-testid={`threat-event-${event.id}`}
    >
      <div className="flex items-start gap-2">
        <span className={`p-1 rounded shrink-0 ${ALERT_COLORS[event.alertLevel]}`}>
          {getEventIcon(event.eventType)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-xs">{EVENT_TYPE_LABEL[event.eventType] || event.eventType}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${ALERT_COLORS[event.alertLevel]}`}>
              {event.alertLevel}
            </span>
            {isTravelerDest && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                Traveler here
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-0.5 font-medium">{event.country}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5 opacity-70">
            {event.publishedAt ? format(new Date(event.publishedAt), "d MMM, HH:mm") : ""}
          </p>
        </div>
      </div>
    </div>
  );

  const renderSection = (label: string, sectionEvents: GdacsEvent[], isTraveler: boolean, icon: typeof Activity) => {
    if (sectionEvents.length === 0) return null;
    const IconComp = icon;
    return (
      <>
        <div className="px-4 py-2 bg-muted/40 border-y flex items-center gap-2 sticky top-0 z-10">
          <IconComp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          <span className="ml-auto text-xs text-muted-foreground">{sectionEvents.length}</span>
        </div>
        <div className="divide-y">
          {sectionEvents.map(e => renderEvent(e, isTraveler))}
        </div>
      </>
    );
  };

  const hasAny = travelerEvents.length + regionalEvents.length + globalEvents.length > 0;

  return (
    <Card className="flex flex-col" data-testid="card-threat-feed">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              Live Threat Feed
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              GDACS · {cachedAt ? format(new Date(cachedAt), "HH:mm") : "—"}
              {cached && <span className="ml-1 opacity-60">(cached)</span>}
              {travelerEvents.length > 0 && (
                <span className="ml-2 text-red-500 font-medium">{travelerEvents.length} at your destinations</span>
              )}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
            disabled={isLoading}
            data-testid="button-refresh-feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto" style={{ maxHeight: "480px" }}>
        {isError ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Unable to reach GDACS feed.
          </div>
        ) : isLoading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : !hasAny ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No active GDACS events
          </div>
        ) : (
          <>
            {renderSection("Your Travelers' Destinations", travelerEvents, true, Users)}
            {renderSection("Pacific Region", regionalEvents, false, MapPin)}
            {renderSection("Global", globalEvents, false, Activity)}
          </>
        )}
      </CardContent>

      <div className="px-4 py-2 border-t shrink-0">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <a href="https://www.gdacs.org" target="_blank" rel="noopener noreferrer" className="underline">
            GDACS
          </a>{" "}
          · UN Office for the Coordination of Humanitarian Affairs
        </p>
      </div>
    </Card>
  );
}

// ── 14-day Deployment Timeline (Gantt) ───────────────────────────────────────
function DeploymentTimeline({ trips }: { trips: Trip[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ganttStart = subDays(today, 3);
  const ganttEnd = addDays(today, 14);
  const totalDays = differenceInDays(ganttEnd, ganttStart);
  const ROW_H = 36;
  const LABEL_W = 140;
  const CHART_W = 600;
  const TOTAL_H = Math.max(80, trips.length * ROW_H + 40);

  const todayX = LABEL_W + (differenceInDays(today, ganttStart) / totalDays) * CHART_W;

  const dateLabels: { label: string; x: number }[] = [];
  for (let i = 0; i <= totalDays; i += 2) {
    const d = addDays(ganttStart, i);
    dateLabels.push({ label: format(d, "d MMM"), x: LABEL_W + (i / totalDays) * CHART_W });
  }

  const activeTrips = trips.filter(t => t.tripStatus === "current" || t.tripStatus === "upcoming");

  return (
    <Card data-testid="card-deployment-timeline">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          14-Day Deployment Overview
        </CardTitle>
        <p className="text-xs text-muted-foreground">Active and upcoming trips — {format(ganttStart, "d MMM")} to {format(ganttEnd, "d MMM yyyy")}</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {activeTrips.length === 0 ? (
          <p className="p-4 text-muted-foreground text-sm text-center">No active or upcoming trips in the next 14 days.</p>
        ) : (
          <svg
            width="100%"
            viewBox={`0 0 ${LABEL_W + CHART_W + 20} ${TOTAL_H}`}
            style={{ minWidth: "500px" }}
          >
            {/* Date grid lines */}
            {dateLabels.map((dl, i) => (
              <g key={i}>
                <line x1={dl.x} y1={20} x2={dl.x} y2={TOTAL_H} stroke="hsl(var(--border))" strokeWidth={0.5} />
                <text x={dl.x} y={14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                  {dl.label}
                </text>
              </g>
            ))}

            {/* Rows */}
            {activeTrips.map((trip, idx) => {
              const y = 24 + idx * ROW_H;
              const tripStart = new Date(trip.startDate);
              const tripEnd = new Date(trip.endDate);
              const clampedStart = tripStart < ganttStart ? ganttStart : tripStart;
              const clampedEnd = tripEnd > ganttEnd ? ganttEnd : tripEnd;
              const barX = LABEL_W + (differenceInDays(clampedStart, ganttStart) / totalDays) * CHART_W;
              const barW = Math.max(6, (differenceInDays(clampedEnd, clampedStart) / totalDays) * CHART_W);
              const barColor = trip.tripStatus === "current"
                ? "hsl(142 60% 45%)"
                : "hsl(var(--primary))";
              const isFlag = !trip.emergencyContactName || trip.visaCheck?.status === "ACTION";

              return (
                <g key={trip.id}>
                  {/* Row bg */}
                  {idx % 2 === 1 && (
                    <rect x={0} y={y - 2} width={LABEL_W + CHART_W + 20} height={ROW_H}
                      fill="hsl(var(--muted))" opacity={0.3} />
                  )}
                  {/* Name label */}
                  <text x={LABEL_W - 6} y={y + 14} textAnchor="end" fontSize={10} fill="hsl(var(--foreground))">
                    {trip.employeeName.split(" ")[0]} {trip.employeeName.split(" ").slice(-1)[0]}
                  </text>
                  <text x={LABEL_W - 6} y={y + 25} textAnchor="end" fontSize={8} fill="hsl(var(--muted-foreground))">
                    {trip.destination.city}
                  </text>
                  {/* Trip bar */}
                  <rect x={barX} y={y + 2} width={barW} height={20} rx={3}
                    fill={barColor} opacity={0.85} />
                  {/* Destination label on bar */}
                  {barW > 40 && (
                    <text x={barX + 4} y={y + 16} fontSize={8} fill="white">
                      {trip.destination.city}
                    </text>
                  )}
                  {/* Departure diamond */}
                  {tripStart >= ganttStart && (
                    <polygon
                      points={`${barX},${y + 2} ${barX + 5},${y - 3} ${barX + 10},${y + 2} ${barX + 5},${y + 7}`}
                      fill={barColor}
                    />
                  )}
                  {/* Welfare flag indicator */}
                  {isFlag && (
                    <circle cx={barX + barW - 6} cy={y + 12} r={4} fill="hsl(0 80% 55%)" />
                  )}
                </g>
              );
            })}

            {/* Today line */}
            <line x1={todayX} y1={16} x2={todayX} y2={TOTAL_H}
              stroke="hsl(0 80% 55%)" strokeWidth={1.5} strokeDasharray="4 2" />
            <text x={todayX + 3} y={TOTAL_H - 4} fontSize={8} fill="hsl(0 80% 55%)">Today</text>
          </svg>
        )}
      </CardContent>
    </Card>
  );
}

// ── Destination Drawer ────────────────────────────────────────────────────────
function DestinationDrawer({
  country, currentTrips, upcomingTrips, gdacsEvents, advisory, onClose,
}: {
  country: string | null;
  currentTrips: Trip[];
  upcomingTrips: Trip[];
  gdacsEvents: GdacsEvent[];
  advisory: Advisory | null;
  onClose: () => void;
}) {
  if (!country) return null;
  const relevantGdacs = gdacsEvents.filter(e => e.country.toLowerCase() === country.toLowerCase());
  return (
    <Sheet open onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="drawer-destination">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {country}
          </SheetTitle>
          {advisory && (
            <span className={`inline-block text-xs px-2 py-1 rounded w-fit ${ADVISORY_COLOR[advisory.level]}`}>
              DFAT Level {advisory.level}: {ADVISORY_LABEL[advisory.level]}
            </span>
          )}
          {advisory && <p className="text-sm text-muted-foreground">{advisory.summary}</p>}
        </SheetHeader>

        <div className="space-y-5">
          {currentTrips.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Currently in {country} ({currentTrips.length})
              </p>
              <div className="space-y-2">
                {currentTrips.map(t => (
                  <div key={t.id} className="rounded-md border border-border p-3 text-sm space-y-1">
                    <p className="font-medium">{t.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{t.position}</p>
                    <p className="text-xs">Returns {format(new Date(t.endDate), "d MMM yyyy")}</p>
                    {t.emergencyContactName
                      ? <p className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {t.emergencyContactName} · {t.emergencyContactPhone}</p>
                      : <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No emergency contact</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingTrips.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <PlaneTakeoff className="w-4 h-4 text-blue-500" />
                Departing to {country} ({upcomingTrips.length})
              </p>
              <div className="space-y-2">
                {upcomingTrips.map(t => (
                  <div key={t.id} className="rounded-md border border-border p-3 text-sm space-y-1">
                    <p className="font-medium">{t.employeeName}</p>
                    <p className="text-xs text-muted-foreground">Departs {format(new Date(t.startDate), "d MMM yyyy")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relevantGdacs.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Activity className="w-4 h-4 text-red-500" />
                Recent GDACS Events
              </p>
              <div className="space-y-2">
                {relevantGdacs.slice(0, 5).map(e => (
                  <div key={e.id} className={`rounded-md border p-3 text-sm ${ALERT_COLORS[e.alertLevel]}`}>
                    <p className="font-medium">{EVENT_TYPE_LABEL[e.eventType] || e.eventType} — {e.alertLevel}</p>
                    <p className="text-xs mt-0.5 line-clamp-3">{e.description}</p>
                    <p className="text-xs mt-1 opacity-70">{e.publishedAt ? format(new Date(e.publishedAt), "d MMM HH:mm") : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTrips.length === 0 && upcomingTrips.length === 0 && relevantGdacs.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">No traveler or threat data for {country}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main TravelWatch page ─────────────────────────────────────────────────────
export default function TravelWatch() {
  const { current, upcoming, completed } = useTripsNowAndUpcoming();
  const allTrips = [...current, ...upcoming, ...completed];
  const now = new Date();

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [mapTooltip, setMapTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "departing">("current");

  // ── Data fetches ──────────────────────────────────────────────────────
  const {
    data: threatData,
    isLoading: threatLoading,
    isError: threatError,
    refetch: refetchThreat,
  } = useQuery<ThreatFeedData>({ queryKey: ["/api/threat-feed"] });

  const { data: advisoryData } = useQuery<AdvisoryData>({
    queryKey: ["/api/travel-advisories"],
  });

  const advisories = advisoryData?.advisories ?? {};
  const gdacsEvents = threatData?.events ?? [];

  // ── Derived welfare metrics ───────────────────────────────────────────
  const activeTrips = [...current, ...upcoming];

  const departingIn48h = useMemo(() =>
    upcoming.filter(t => differenceInDays(new Date(t.startDate), now) <= 2),
  [upcoming]);

  const returningThisWeek = useMemo(() =>
    current.filter(t => differenceInDays(new Date(t.endDate), now) <= 7),
  [current]);

  const missingContacts = useMemo(() =>
    activeTrips.filter(t => !t.emergencyContactName),
  [activeTrips]);

  const visaActionTrips = useMemo(() =>
    activeTrips.filter(t => t.visaCheck?.status === "ACTION"),
  [activeTrips]);

  const longTrips = useMemo(() =>
    activeTrips.filter(t => differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1 > 14),
  [activeTrips]);

  const returningVSoon = useMemo(() =>
    current.filter(t => differenceInDays(new Date(t.endDate), now) <= 3),
  [current]);

  const highAdvisoryTrips = useMemo(() =>
    activeTrips.filter(t => advisories[t.destination.country]?.level >= 3),
  [activeTrips, advisories]);

  const gdacsAtDestinations = useMemo(() => {
    const travelerCountrySet = new Set(activeTrips.map(t => t.destination.country.toLowerCase()));
    return gdacsEvents.filter(e => travelerCountrySet.has(e.country.toLowerCase()) && e.alertLevel !== "Green");
  }, [activeTrips, gdacsEvents]);

  const welfareFlags = missingContacts.length + visaActionTrips.length + gdacsAtDestinations.length;

  const travelerCountriesLower = useMemo(() =>
    new Set(activeTrips.map(t => t.destination.country.toLowerCase())),
  [activeTrips]);

  // ── Map state ─────────────────────────────────────────────────────────
  const travelerDestinations = useMemo(() => {
    const map = new Map<string, { city: string; country: string; current: Trip[]; upcoming: Trip[] }>();
    current.forEach(t => {
      const key = t.destination.city;
      if (!map.has(key)) map.set(key, { city: t.destination.city, country: t.destination.country, current: [], upcoming: [] });
      map.get(key)!.current.push(t);
    });
    upcoming.forEach(t => {
      const key = t.destination.city;
      if (!map.has(key)) map.set(key, { city: t.destination.city, country: t.destination.country, current: [], upcoming: [] });
      map.get(key)!.upcoming.push(t);
    });
    return Array.from(map.values());
  }, [current, upcoming]);

  // Destination for the drawer
  const drawerTrips = useMemo(() => {
    if (!selectedCountry) return { current: [], upcoming: [] };
    return {
      current: current.filter(t => t.destination.country === selectedCountry),
      upcoming: upcoming.filter(t => t.destination.country === selectedCountry),
    };
  }, [selectedCountry, current, upcoming]);

  // ── Export emergency contacts CSV ─────────────────────────────────────
  const exportEmergencyContacts = () => {
    const data = activeTrips.map(t => ({
      "TTR #": t.ttrNumber ?? t.id,
      "Employee": t.employeeName,
      "Position": t.position,
      "Department": t.department,
      "Destination": `${t.destination.city}, ${t.destination.country}`,
      "Departure": format(new Date(t.startDate), "dd/MM/yyyy"),
      "Return": format(new Date(t.endDate), "dd/MM/yyyy"),
      "Status": t.tripStatus === "current" ? "In Field" : "Upcoming",
      "Emergency Contact": t.emergencyContactName || "NOT ON FILE",
      "Emergency Phone": t.emergencyContactPhone || "NOT ON FILE",
      "Visa Status": t.visaCheck?.status ?? "N/A",
      "Country Risk": t.countryRiskLevel ?? "low",
      "DFAT Advisory": advisories[t.destination.country]
        ? `Level ${advisories[t.destination.country].level}`
        : "N/A",
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `emergency-contacts_${format(now, "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // ── Map country fill ──────────────────────────────────────────────────
  const getGeoFill = useCallback((geoId: number) => {
    const countryName = ISO_NUM_TO_NAME[geoId];
    if (!countryName) return "hsl(var(--muted))";
    const hasTraveler = activeTrips.some(t => t.destination.country === countryName);
    const advisory = advisories[countryName];
    if (hasTraveler && advisory && advisory.level >= 2) {
      return advisory.level >= 3 ? "hsl(25 80% 55% / 0.6)" : "hsl(45 80% 50% / 0.5)";
    }
    if (hasTraveler) return "hsl(var(--primary) / 0.55)";
    if (advisory && advisory.level >= 2) return ADVISORY_MAP_FILL[advisory.level];
    return "hsl(var(--muted))";
  }, [activeTrips, advisories]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="heading-travel-watch">
              Travel Command Centre
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-xs font-semibold text-green-800 dark:text-green-300">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Island Travel Technologies · Duty-of-care dashboard · {format(now, "EEEE d MMMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={exportEmergencyContacts}
              data-testid="button-export-contacts"
            >
              <Phone className="w-4 h-4 mr-2" />
              Emergency Contacts
            </Button>
            <Button variant="outline" onClick={exportEmergencyContacts} data-testid="button-export-csv">
              <FileDown className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* ── KPI Strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Currently Away",
              value: current.length,
              sub: `${Array.from(new Set(current.map(t => t.destination.country))).length} countries`,
              Icon: Users,
              accent: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
              pulse: true,
              testId: "kpi-currently-away",
            },
            {
              label: "Departing 48 hrs",
              value: departingIn48h.length,
              sub: departingIn48h.length ? departingIn48h.map(t => t.employeeName.split(" ")[0]).join(", ") : "No imminent departures",
              Icon: PlaneTakeoff,
              accent: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
              pulse: departingIn48h.length > 0,
              testId: "kpi-departing-soon",
            },
            {
              label: "Returning This Week",
              value: returningThisWeek.length,
              sub: returningThisWeek.length ? returningThisWeek.map(t => t.employeeName.split(" ")[0]).join(", ") : "No returns this week",
              Icon: PlaneLanding,
              accent: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
              pulse: false,
              testId: "kpi-returning-week",
            },
            {
              label: "Welfare Flags",
              value: welfareFlags,
              sub: welfareFlags === 0 ? "All travelers cleared" : `${missingContacts.length} missing contacts · ${visaActionTrips.length} visa issues`,
              Icon: welfareFlags > 0 ? ShieldAlert : ShieldCheck,
              accent: welfareFlags > 0
                ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                : "bg-muted text-muted-foreground",
              pulse: welfareFlags > 0,
              testId: "kpi-welfare-flags",
            },
          ].map(kpi => (
            <Card key={kpi.label} data-testid={kpi.testId} className="hover-elevate">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-3xl font-bold mt-1" data-testid={`stat-${kpi.testId}`}>{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{kpi.sub}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${kpi.accent}`}>
                    <kpi.Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Welfare Alerts ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          {missingContacts.length > 0 && (
            <Alert className="border-red-400 bg-red-50 dark:bg-red-950/20" data-testid="alert-missing-contact">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-900 dark:text-red-200">
                <strong>No emergency contact:</strong>{" "}
                {missingContacts.map((t, i) => (
                  <span key={t.id}>{i > 0 && ", "}{t.employeeName} ({t.destination.city})</span>
                ))}
                {" "}— Please update records before or during travel.
              </AlertDescription>
            </Alert>
          )}
          {gdacsAtDestinations.length > 0 && (
            <Alert className="border-orange-400 bg-orange-50 dark:bg-orange-950/20" data-testid="alert-gdacs-dest">
              <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-900 dark:text-orange-200">
                <strong>Active GDACS alert</strong> in a traveler destination:{" "}
                {gdacsAtDestinations.slice(0, 3).map((e, i) => (
                  <span key={e.id}>{i > 0 && " | "}{e.alertLevel} {EVENT_TYPE_LABEL[e.eventType] || e.eventType} — {e.country}</span>
                ))}
              </AlertDescription>
            </Alert>
          )}
          {returningVSoon.length > 0 && (
            <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/20" data-testid="alert-returning-soon">
              <PlaneLanding className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-200">
                <strong>{returningVSoon.length} traveler{returningVSoon.length > 1 ? "s" : ""} returning within 3 days:</strong>{" "}
                {returningVSoon.map((t, i) => (
                  <span key={t.id}>{i > 0 && ", "}{t.employeeName} (returns {format(new Date(t.endDate), "d MMM")})</span>
                ))}
              </AlertDescription>
            </Alert>
          )}
          {longTrips.length > 0 && (
            <Alert className="border-blue-400 bg-blue-50 dark:bg-blue-950/20" data-testid="alert-long-trips">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-200">
                <strong>Extended deployment ({">"}14 days):</strong>{" "}
                {longTrips.map((t, i) => (
                  <span key={t.id}>{i > 0 && ", "}{t.employeeName} — {differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1} days to {t.destination.city}</span>
                ))}
                {" "}— Welfare check-in recommended.
              </AlertDescription>
            </Alert>
          )}
          {departingIn48h.length > 0 && (
            <Alert className="border-purple-400 bg-purple-50 dark:bg-purple-950/20" data-testid="alert-departing-48h">
              <PlaneTakeoff className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertDescription className="text-purple-900 dark:text-purple-200">
                <strong>Departing within 48 hours:</strong>{" "}
                {departingIn48h.map((t, i) => (
                  <span key={t.id}>{i > 0 && ", "}{t.employeeName} → {t.destination.city} ({format(new Date(t.startDate), "d MMM")})</span>
                ))}
                {" "}— Confirm welfare readiness before departure.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* ── World Map ─────────────────────────────────────────────────── */}
        <Card data-testid="card-world-map">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Global Traveler Map
              <span className="text-xs font-normal text-muted-foreground ml-1">Pacific-centred · Click a destination for details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 relative">
            <div className="relative bg-muted/30 rounded-md overflow-hidden" style={{ height: "520px" }}>
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ rotate: [-155, 0, 0], scale: 160, center: [0, -10] }}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup zoom={1} minZoom={0.6} maxZoom={8}>
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const geoId = Number(geo.id);
                        const countryName = ISO_NUM_TO_NAME[geoId];
                        const fill = getGeoFill(geoId);
                        const hasTraveler = countryName ? activeTrips.some(t => t.destination.country === countryName) : false;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke="hsl(var(--background))"
                            strokeWidth={0.3}
                            style={{
                              default: { outline: "none", cursor: hasTraveler ? "pointer" : "default" },
                              hover: { outline: "none", fill: hasTraveler ? "hsl(var(--primary) / 0.75)" : fill },
                              pressed: { outline: "none" },
                            }}
                            onClick={() => countryName && setSelectedCountry(countryName)}
                          />
                        );
                      })
                    }
                  </Geographies>

                  {/* Traveler destination pulse markers */}
                  {travelerDestinations.map(dest => {
                    const coords = DEST_COORDS[dest.city];
                    if (!coords) return null;
                    const hasFlag = dest.current.some(t => !t.emergencyContactName || t.visaCheck?.status === "ACTION")
                      || dest.upcoming.some(t => !t.emergencyContactName);
                    const totalCount = dest.current.length + dest.upcoming.length;
                    const markerColor = hasFlag ? "#ef4444" : dest.current.length > 0 ? "#22c55e" : "#3b82f6";
                    return (
                      <Marker
                        key={dest.city}
                        coordinates={[coords.lng, coords.lat]}
                        onClick={() => setSelectedCountry(dest.country)}
                      >
                        {/* Pulse ring animation */}
                        <circle r={10} fill={markerColor} fillOpacity={0.15} stroke="none">
                          <animate attributeName="r" from="10" to="22" dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="fill-opacity" from="0.4" to="0" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        {/* Solid dot */}
                        <circle
                          r={8}
                          fill={markerColor}
                          stroke="white"
                          strokeWidth={2}
                          style={{ cursor: "pointer" }}
                        />
                        {/* Count label inside dot */}
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ fontSize: "8px", fill: "white", fontWeight: 700, pointerEvents: "none" }}
                        >
                          {totalCount}
                        </text>
                        {/* City name below, small and readable */}
                        <text
                          textAnchor="middle"
                          y={18}
                          style={{
                            fontSize: "8px",
                            fill: "hsl(var(--foreground))",
                            fontWeight: 600,
                            pointerEvents: "none",
                            textShadow: "0 1px 3px white, 0 -1px 3px white",
                          }}
                        >
                          {dest.city}
                        </text>
                      </Marker>
                    );
                  })}

                  {/* GDACS event markers (Orange/Red only) */}
                  {gdacsEvents
                    .filter(e => e.alertLevel !== "Green" && Math.abs(e.lat) < 85)
                    .slice(0, 15)
                    .map(event => (
                      <Marker key={event.id} coordinates={[event.lng, event.lat]}>
                        <polygon
                          points="0,-6 5,4 -5,4"
                          fill={event.alertLevel === "Red" ? "#ef4444" : "#f59e0b"}
                          fillOpacity={0.85}
                          stroke="white"
                          strokeWidth={0.8}
                        />
                      </Marker>
                    ))
                  }
                </ZoomableGroup>
              </ComposableMap>

              {/* Map legend */}
              <div className="absolute bottom-3 right-3 bg-card/90 border border-border rounded-md p-2 text-xs space-y-1">
                <p className="font-semibold text-xs mb-1">Legend</p>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> Travelers in field</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Upcoming</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Welfare flag</div>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12"><polygon points="6,0 12,10 0,10" fill="#f59e0b" /></svg>
                  GDACS alert
                </div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded" style={{ background: "hsl(var(--primary) / 0.55)" }} /> Traveler country</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-amber-400/40" /> Level 2 advisory</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-orange-500/40" /> Level 3 advisory</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-red-500/40" /> Level 4 advisory</div>
              </div>
            </div>

            {/* DFAT source */}
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              Advisory overlay: Australian DFAT Smartraveller (curated, last reviewed {advisoryData?.lastReviewed}).
              Disaster markers: GDACS real-time feed.
            </p>
          </CardContent>
        </Card>

        {/* ── Two-column: Traveler Cards + Threat Feed ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Traveler cards */}
          <div className="lg:col-span-3 space-y-4">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="current" data-testid="tab-current-travelers">
                    Currently Away ({current.length})
                  </TabsTrigger>
                  <TabsTrigger value="departing" data-testid="tab-departing-soon">
                    Departing Soon ({upcoming.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="current" className="mt-4">
                {current.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No travelers currently in the field</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {current.map(trip => (
                      <TravelerCard
                        key={trip.id}
                        trip={trip}
                        advisories={advisories}
                        gdacsEvents={gdacsEvents}
                        onClick={() => setSelectedCountry(trip.destination.country)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="departing" className="mt-4">
                {upcoming.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <PlaneTakeoff className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No upcoming departures in the next 30 days</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {upcoming.map(trip => {
                      const daysUntil = differenceInDays(new Date(trip.startDate), now);
                      const missingContact = !trip.emergencyContactName;
                      const visaIssue = trip.visaCheck?.status === "ACTION";
                      const readyColor = (!missingContact && !visaIssue) ? "bg-green-500" : "bg-amber-500";
                      return (
                        <Card
                          key={trip.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedCountry(trip.destination.country)}
                          data-testid={`row-upcoming-${trip.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${readyColor}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{trip.employeeName}</span>
                                  <span className="text-muted-foreground text-xs">→ {trip.destination.city}, {trip.destination.country}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                  <span>{format(new Date(trip.startDate), "d MMM")} – {format(new Date(trip.endDate), "d MMM")}</span>
                                  {missingContact && <span className="text-red-500">No emergency contact</span>}
                                  {visaIssue && <span className="text-amber-600">Visa action needed</span>}
                                </div>
                              </div>
                              <span className="text-xs font-semibold shrink-0 text-muted-foreground">
                                {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil}d`}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Threat Feed */}
          <div className="lg:col-span-2">
            <ThreatFeedPanel
              events={gdacsEvents}
              cachedAt={threatData?.cachedAt}
              cached={threatData?.cached}
              isLoading={threatLoading}
              isError={threatError}
              onRefresh={() => refetchThreat()}
              travelerCountries={travelerCountriesLower}
            />
          </div>
        </div>

        {/* ── Deployment Timeline ────────────────────────────────────────── */}
        <DeploymentTimeline trips={[...current, ...upcoming]} />

        {/* ── Destination Roster ─────────────────────────────────────────── */}
        {travelerDestinations.length > 0 && (
          <Card data-testid="card-destination-roster">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Destination Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3 text-center">In Field</th>
                      <th className="px-4 py-3 text-center">Departing</th>
                      <th className="px-4 py-3">Last Return</th>
                      <th className="px-4 py-3">Advisory</th>
                      <th className="px-4 py-3">GDACS</th>
                      <th className="px-4 py-3">Welfare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelerDestinations.map((dest, idx) => {
                      const advisory = advisories[dest.country];
                      const destGdacs = gdacsEvents.filter(
                        e => e.country.toLowerCase() === dest.country.toLowerCase() && e.alertLevel !== "Green"
                      );
                      const hasWelfareIssue = [
                        ...dest.current, ...dest.upcoming
                      ].some(t => !t.emergencyContactName || t.visaCheck?.status === "ACTION");
                      const latestReturn = dest.current.length > 0
                        ? new Date(Math.max(...dest.current.map(t => new Date(t.endDate).getTime())))
                        : null;
                      return (
                        <tr
                          key={idx}
                          className="border-b last:border-0 hover-elevate cursor-pointer"
                          onClick={() => setSelectedCountry(dest.country)}
                          data-testid={`row-destination-${idx}`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{dest.city}</p>
                            <p className="text-xs text-muted-foreground">{dest.country}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {dest.current.length > 0
                              ? <Badge className="bg-green-600 hover:bg-green-600 text-white">{dest.current.length}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {dest.upcoming.length > 0
                              ? <Badge variant="secondary">{dest.upcoming.length}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {latestReturn ? format(latestReturn, "d MMM yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {advisory
                              ? <span className={`text-xs px-1.5 py-0.5 rounded ${ADVISORY_COLOR[advisory.level]}`}>
                                  L{advisory.level} {ADVISORY_LABEL[advisory.level]}
                                </span>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {destGdacs.length > 0
                              ? <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                  <Activity className="w-3 h-3" />{destGdacs[0].alertLevel}
                                </span>
                              : <span className="text-muted-foreground text-xs">Clear</span>}
                          </td>
                          <td className="px-4 py-3">
                            {hasWelfareIssue
                              ? <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                  <AlertCircle className="w-3 h-3" /> Action
                                </span>
                              : <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                                  <CheckCircle2 className="w-3 h-3" /> Clear
                                </span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Destination Drawer ─────────────────────────────────────────── */}
        <DestinationDrawer
          country={selectedCountry}
          currentTrips={drawerTrips.current}
          upcomingTrips={drawerTrips.upcoming}
          gdacsEvents={gdacsEvents}
          advisory={selectedCountry ? (advisories[selectedCountry] ?? null) : null}
          onClose={() => setSelectedCountry(null)}
        />
      </div>
    </TooltipProvider>
  );
}
