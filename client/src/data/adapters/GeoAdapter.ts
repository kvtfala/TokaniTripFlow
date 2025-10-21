// Mock geocoding adapter for known destinations
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CityCoordinates extends Coordinates {
  city: string;
  country: string;
}

// Mock coordinates for common destinations
const CITY_COORDINATES: Record<string, Coordinates> = {
  'Nadi,Fiji': { lat: -17.75, lng: 177.45 },
  'Suva,Fiji': { lat: -18.14, lng: 178.44 },
  'Sydney,Australia': { lat: -33.86, lng: 151.20 },
  'Auckland,New Zealand': { lat: -36.85, lng: 174.76 },
  'Melbourne,Australia': { lat: -37.81, lng: 144.96 },
  'Brisbane,Australia': { lat: -27.47, lng: 153.02 },
  'Wellington,New Zealand': { lat: -41.28, lng: 174.77 },
  'Singapore,Singapore': { lat: 1.35, lng: 103.82 },
  'Tokyo,Japan': { lat: 35.68, lng: 139.65 },
  'Los Angeles,United States': { lat: 34.05, lng: -118.24 },
  'London,United Kingdom': { lat: 51.50, lng: -0.12 },
  'Dubai,United Arab Emirates': { lat: 25.20, lng: 55.27 },
  'Hong Kong,China': { lat: 22.32, lng: 114.17 },
};

// Default fallback to Fiji
const DEFAULT_COORDINATES: Coordinates = { lat: -17.8, lng: 178.0 };

export async function geocodeCity(
  city: string,
  country: string
): Promise<Coordinates> {
  // Simulate async API call
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const key = `${city},${country}`;
  return CITY_COORDINATES[key] || DEFAULT_COORDINATES;
}

export function getAllKnownCoordinates(): CityCoordinates[] {
  return Object.entries(CITY_COORDINATES).map(([key, coords]) => {
    const [city, country] = key.split(',');
    return { city, country, ...coords };
  });
}
