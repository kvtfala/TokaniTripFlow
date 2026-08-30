import { Badge } from "@/components/ui/badge";
import type { RequestStatus, VisaStatus } from "@shared/types";

type DisplayStatus = RequestStatus | VisaStatus;

interface StatusBadgeProps {
  status: DisplayStatus;
  type?: "request" | "claim" | "visa";
  id?: string;
}

export function StatusBadge({ status, type = "request", id }: StatusBadgeProps) {
  const statusConfig: Record<DisplayStatus, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className: "bg-neutral/20 text-neutral-foreground border-neutral/30",
    },
    pending: {
      label: "Pending",
      className: "bg-warning/10 text-warning-foreground border-warning/20",
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
    OK: {
      label: "OK",
      className: "bg-success/10 text-success-foreground border-success/20",
    },
    WARNING: {
      label: "Warning",
      className: "bg-warning/10 text-warning-foreground border-warning/20",
    },
    ACTION: {
      label: "Action required",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const testId = id ? `badge-status-${id}` : `badge-status-${status}`;

  return (
    <Badge className={config.className} data-testid={testId}>
      {config.label}
    </Badge>
  );
}
