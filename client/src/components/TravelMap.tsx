import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trip } from "@/data/hooks";
import { geocodeCity, type Coordinates } from "@/data/adapters/GeoAdapter";
import { format } from "date-fns";
import { MapPin } from "lucide-react";

interface TravelMapProps {
  trips: Trip[];
}

interface MapMarker {
  trip: Trip;
  coords: Coordinates;
}

export function TravelMap({ trips }: TravelMapProps) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);

  useEffect(() => {
    async function loadCoordinates() {
      const markersWithCoords = await Promise.all(
        trips.map(async (trip) => ({
          trip,
          coords: await geocodeCity(trip.destination.city, trip.destination.country),
        }))
      );
      setMarkers(markersWithCoords);
    }
    loadCoordinates();
  }, [trips]);

  // Convert lat/lng to SVG coordinates
  // Map projection: simple equirectangular (good enough for Pacific region)
  const projectToSVG = (lat: number, lng: number) => {
    // Center map on Fiji (lat: -18, lng: 178)
    // SVG viewBox: 0 0 800 500
    const centerLat = -18;
    const centerLng = 178;
    
    // Scale factors (degrees to pixels)
    const scaleX = 2.5; // More zoom for Pacific focus
    const scaleY = 2.5;
    
    const x = 400 + (lng - centerLng) * scaleX;
    const y = 250 - (lat - centerLat) * scaleY; // Invert Y for SVG
    
    return { x, y };
  };

  const getMarkerColor = (status: Trip['tripStatus']) => {
    switch (status) {
      case 'current':
        return '#22c55e'; // green
      case 'upcoming':
        return '#eab308'; // yellow
      case 'completed':
        return '#94a3b8'; // gray
      default:
        return '#3b82f6'; // blue
    }
  };

  return (
    <div className="relative">
      <Card className="p-4">
        {/* Map Legend */}
        <div className="absolute top-6 right-6 z-10 bg-card border rounded-md p-3 shadow-lg text-sm">
          <div className="font-semibold mb-2">Map Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Upcoming (7 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* SVG Map */}
        <svg
          viewBox="0 0 800 500"
          className="w-full h-[500px] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-slate-900 rounded-md"
          aria-label="World map showing traveler locations"
        >
          {/* Simple ocean/land representation */}
          <rect x="0" y="0" width="800" height="500" fill="url(#oceanGradient)" />
          
          <defs>
            <radialGradient id="oceanGradient">
              <stop offset="0%" stopColor="hsl(210, 100%, 95%)" className="dark:stop-color-[hsl(210,40%,10%)]" />
              <stop offset="100%" stopColor="hsl(210, 100%, 85%)" className="dark:stop-color-[hsl(210,40%,15%)]" />
            </radialGradient>
          </defs>

          {/* Grid lines for reference */}
          <g opacity="0.2" stroke="currentColor" strokeWidth="0.5">
            {[...Array(9)].map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={i * 62.5}
                x2="800"
                y2={i * 62.5}
              />
            ))}
            {[...Array(13)].map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 66.67}
                y1="0"
                x2={i * 66.67}
                y2="500"
              />
            ))}
          </g>

          {/* Connection lines from Fiji to destinations */}
          {markers.map((marker, idx) => {
            const fiji = projectToSVG(-18, 178);
            const dest = projectToSVG(marker.coords.lat, marker.coords.lng);
            
            return (
              <line
                key={`line-${idx}`}
                x1={fiji.x}
                y1={fiji.y}
                x2={dest.x}
                y2={dest.y}
                stroke={getMarkerColor(marker.trip.tripStatus)}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.3"
              />
            );
          })}

          {/* Destination markers */}
          {markers.map((marker, idx) => {
            const { x, y } = projectToSVG(marker.coords.lat, marker.coords.lng);
            const isHovered = hoveredMarker === marker;
            
            return (
              <g
                key={idx}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
                className="cursor-pointer transition-transform hover:scale-125"
                role="button"
                tabIndex={0}
                aria-label={`${marker.trip.employeeName} traveling to ${marker.trip.destination.city}`}
              >
                <circle
                  r={isHovered ? "8" : "6"}
                  fill={getMarkerColor(marker.trip.tripStatus)}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all"
                />
                {isHovered && (
                  <circle
                    r="12"
                    fill="none"
                    stroke={getMarkerColor(marker.trip.tripStatus)}
                    strokeWidth="2"
                    opacity="0.5"
                  />
                )}
              </g>
            );
          })}

          {/* Fiji base marker */}
          <g transform={`translate(${projectToSVG(-18, 178).x}, ${projectToSVG(-18, 178).y})`}>
            <circle
              r="5"
              fill="hsl(var(--primary))"
              stroke="white"
              strokeWidth="2"
            />
            <text
              y="-10"
              textAnchor="middle"
              fill="currentColor"
              fontSize="12"
              fontWeight="600"
            >
              Fiji
            </text>
          </g>
        </svg>

        {/* Hover Popup */}
        {hoveredMarker && (
          <div className="absolute top-4 left-4 z-20 max-w-xs">
            <Card className="p-4 shadow-xl border-2">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">{hoveredMarker.trip.employeeName}</h3>
                </div>
                <Badge
                  variant={hoveredMarker.trip.tripStatus === 'current' ? 'default' : 'secondary'}
                >
                  {hoveredMarker.trip.tripStatus === 'current' ? 'In Progress' : 'Upcoming'}
                </Badge>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Destination:</span>{' '}
                  {hoveredMarker.trip.destination.city}, {hoveredMarker.trip.destination.country}
                </div>
                <div>
                  <span className="text-muted-foreground">Dates:</span>{' '}
                  {format(new Date(hoveredMarker.trip.startDate), 'dd MMM')} –{' '}
                  {format(new Date(hoveredMarker.trip.endDate), 'dd MMM yyyy')}
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>{' '}
                  {hoveredMarker.trip.department}
                </div>
                <div>
                  <span className="text-muted-foreground">Cost Centre:</span>{' '}
                  {hoveredMarker.trip.costCentre.code}
                </div>
              </div>
            </Card>
          </div>
        )}

        {trips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active trips to display</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
