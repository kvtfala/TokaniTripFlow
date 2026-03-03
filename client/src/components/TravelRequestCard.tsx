import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, MapPin, User } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { type TravelRequest } from "@shared/types";
import { format } from "date-fns";

interface TravelRequestCardProps {
  request: TravelRequest;
  onClick?: () => void;
}

export function TravelRequestCard({ request, onClick }: TravelRequestCardProps) {
  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-request-${request.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-base">{request.employeeName}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{request.purpose}</p>
          </div>
          <StatusBadge status={request.status} type="request" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{request.destination.code}</span>
          <span className="text-muted-foreground">·</span>
          <span>{request.destination.city}, {request.destination.country}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>
            {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Per Diem</span>
          <span className="font-semibold text-primary">FJD {request.perDiem.totalFJD.toFixed(2)}</span>
        </div>
        {request.ttrNumber && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">TTR #</span>
            <span className="text-xs font-semibold" data-testid={`text-ttr-card-${request.id}`}>{request.ttrNumber}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
