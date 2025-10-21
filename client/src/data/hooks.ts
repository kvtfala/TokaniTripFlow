import { useQuery } from "@tanstack/react-query";
import type { TravelRequest } from "@shared/types";

export interface Trip extends TravelRequest {
  tripStatus: 'upcoming' | 'current' | 'completed';
}

export interface TripsData {
  current: Trip[];
  upcoming: Trip[];
  completed: Trip[];
}

export function useTripsNowAndUpcoming(): TripsData {
  const { data: requests = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Filter only approved trips
  const approvedTrips = requests.filter(req => req.status === "approved");

  const categorizedTrips = approvedTrips.map((req): Trip => {
    const startDate = new Date(req.startDate);
    const endDate = new Date(req.endDate);

    let tripStatus: 'upcoming' | 'current' | 'completed';
    
    if (now >= startDate && now <= endDate) {
      tripStatus = 'current';
    } else if (startDate > now && startDate <= thirtyDaysFromNow) {
      tripStatus = 'upcoming';
    } else if (endDate < now) {
      tripStatus = 'completed';
    } else {
      tripStatus = 'upcoming'; // Future trips beyond 30 days
    }

    return {
      ...req,
      tripStatus,
    };
  });

  return {
    current: categorizedTrips.filter(t => t.tripStatus === 'current'),
    upcoming: categorizedTrips.filter(t => t.tripStatus === 'upcoming'),
    completed: categorizedTrips.filter(t => t.tripStatus === 'completed'),
  };
}
