import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@shared/types";

interface StatusBadgeProps {
  status: RequestStatus;
  type?: "request" | "claim";
}

export function StatusBadge({ status, type = "request" }: StatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: "Draft",
      className: "bg-[hsl(var(--ocean-light))] text-[hsl(var(--ocean))] hover:bg-[hsl(var(--ocean-light))] dark:bg-[hsl(var(--ocean-light))] dark:text-[hsl(var(--ocean))]",
    },
    submitted: {
      label: "Submitted",
      className: "bg-[hsl(var(--ocean-light))] text-[hsl(var(--ocean))] hover:bg-[hsl(var(--ocean-light))] dark:bg-[hsl(var(--ocean-light))] dark:text-[hsl(var(--ocean))]",
    },
    in_review: {
      label: "In Review",
      className: "bg-[hsl(var(--sand-light))] text-[hsl(var(--ocean))] hover:bg-[hsl(var(--sand-light))] dark:bg-[hsl(var(--sand-light))] dark:text-[hsl(var(--ocean))]",
    },
    approved: {
      label: "Approved",
      className: "bg-[hsl(var(--lagoon-light))] text-[hsl(var(--lagoon))] hover:bg-[hsl(var(--lagoon-light))] dark:bg-[hsl(var(--lagoon-light))] dark:text-[hsl(185_100%_65%)]",
    },
    rejected: {
      label: "Rejected",
      className: "bg-[hsl(var(--coral-light))] text-[hsl(var(--coral))] hover:bg-[hsl(var(--coral-light))] dark:bg-[hsl(var(--coral-light))] dark:text-[hsl(355_77%_75%)]",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
