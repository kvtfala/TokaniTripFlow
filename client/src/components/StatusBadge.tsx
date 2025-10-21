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
      className: "bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
    },
    submitted: {
      label: "Submitted",
      className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
    },
    in_review: {
      label: "In Review",
      className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-300",
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
