import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@shared/types";

interface StatusBadgeProps {
  status: RequestStatus;
  type?: "request" | "claim";
}

export function StatusBadge({ status, type = "request" }: StatusBadgeProps) {
  const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-neutral/20 text-neutral-foreground border-neutral/30",
    },
    submitted: {
      label: "Submitted",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    in_review: {
      label: "In Review",
      className: "bg-warning/10 text-warning-foreground border-warning/20",
    },
    awaiting_quotes: {
      label: "Awaiting Quotes",
      className: "bg-warning/15 text-warning-foreground border-warning/25",
    },
    quotes_submitted: {
      label: "Quotes Submitted",
      className: "bg-primary/15 text-primary border-primary/25",
    },
    approved: {
      label: "Approved",
      className: "bg-success/10 text-success-foreground border-success/20",
    },
    rejected: {
      label: "Rejected",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
    ticketed: {
      label: "Ticketed",
      className: "bg-success/15 text-success-foreground border-success/25",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
