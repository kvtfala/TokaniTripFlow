import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertTriangle, Shield } from "lucide-react";
import { type RequestStatus, type VisaStatus } from "@shared/types";

interface StatusBadgeProps {
  status: RequestStatus | VisaStatus;
  type?: "request" | "visa";
}

export function StatusBadge({ status, type = "request" }: StatusBadgeProps) {
  if (type === "visa") {
    const visaStatus = status as VisaStatus;
    if (visaStatus === "OK") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover-elevate" data-testid={`badge-visa-${status.toLowerCase()}`}>
          <Shield className="w-3 h-3 mr-1" />
          Visa OK
        </Badge>
      );
    }
    if (visaStatus === "WARNING") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover-elevate" data-testid={`badge-visa-${status.toLowerCase()}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Visa Warning
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover-elevate" data-testid={`badge-visa-${status.toLowerCase()}`}>
        <AlertTriangle className="w-3 h-3 mr-1" />
          Action Required
      </Badge>
    );
  }

  const requestStatus = status as RequestStatus;
  if (requestStatus === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover-elevate" data-testid={`badge-status-${status}`}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (requestStatus === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover-elevate" data-testid={`badge-status-${status}`}>
        <XCircle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover-elevate" data-testid={`badge-status-${status}`}>
      <Clock className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
}
