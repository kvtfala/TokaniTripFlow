import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  PlaneTakeoff,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRole } from "@/contexts/RoleContext";
import { differenceInDays } from "date-fns";
import type { TravelRequest } from "@shared/types";

const STORAGE_KEY = "ttf_dismissed_v1";

interface Notification {
  id: string;
  title: string;
  description: string;
  href: string;
  type: "approval" | "overdue" | "departure" | "status" | "risk";
  isUrgent: boolean;
}

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function iconFor(type: Notification["type"]) {
  switch (type) {
    case "approval": return CheckCircle;
    case "overdue": return Clock;
    case "departure": return PlaneTakeoff;
    case "risk": return AlertTriangle;
    case "status": return Check;
  }
}

function colorFor(type: Notification["type"], isUrgent: boolean): string {
  if (type === "risk") return "text-destructive bg-destructive/10";
  if (type === "overdue" && isUrgent) return "text-destructive bg-destructive/10";
  if (type === "approval" || type === "overdue") return "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
  if (type === "departure") return "text-primary bg-primary/10";
  if (type === "status") return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
  return "text-muted-foreground bg-muted";
}

export function NotificationBell() {
  const { currentUser } = useRole();
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);
  const [open, setOpen] = useState(false);

  const { data: requests = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const role = currentUser?.role || "employee";
  const isManagerRole = ["manager", "super_admin", "coordinator"].includes(role);
  const today = new Date();

  // ── Compute notifications ─────────────────────────────────────────────────
  const all: Notification[] = [];

  if (isManagerRole) {
    const submitted = requests.filter(r => ["submitted", "in_review"].includes(r.status));
    const quotesReady = requests.filter(r => r.status === "quotes_submitted");
    const total = submitted.length + quotesReady.length;

    if (total > 0) {
      all.push({
        id: "pending-approvals",
        title: `${total} request${total !== 1 ? "s" : ""} need your approval`,
        description: `${submitted.length} pending review · ${quotesReady.length} quotes ready`,
        href: "/approvals",
        type: "approval",
        isUrgent: true,
      });
    }

    // Individual overdue items (≥5 days waiting)
    submitted
      .filter(r => r.submittedAt && differenceInDays(today, new Date(r.submittedAt)) >= 5)
      .slice(0, 3)
      .forEach(r => {
        const days = differenceInDays(today, new Date(r.submittedAt!));
        all.push({
          id: `overdue-${r.id}`,
          title: `Overdue: ${r.employeeName}'s request`,
          description: `${days} days waiting · ${r.destination.city}, ${r.destination.country}`,
          href: `/requests/${r.id}`,
          type: "overdue",
          isUrgent: days >= 7,
        });
      });
  }

  // Upcoming departures ≤2 days (relevant requests based on role)
  const scopedRequests = role === "employee"
    ? requests.filter(r => r.employeeId === currentUser?.id)
    : requests;

  scopedRequests
    .filter(r => ["approved", "ticketed"].includes(r.status))
    .filter(r => {
      const days = differenceInDays(new Date(r.startDate), today);
      return days >= 0 && days <= 2;
    })
    .slice(0, 3)
    .forEach(r => {
      const days = differenceInDays(new Date(r.startDate), today);
      all.push({
        id: `departure-soon-${r.id}`,
        title: days === 0
          ? `${r.employeeName} departs today`
          : `${r.employeeName} departs tomorrow`,
        description: `To ${r.destination.city}, ${r.destination.country}`,
        href: `/requests/${r.id}`,
        type: "departure",
        isUrgent: days === 0,
      });
    });

  // High-risk destinations with active travellers
  requests
    .filter(r => {
      if (!["approved", "ticketed"].includes(r.status)) return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return start <= today && today <= end && r.countryRiskLevel === "high";
    })
    .slice(0, 2)
    .forEach(r => {
      all.push({
        id: `high-risk-${r.id}`,
        title: `Travel advisory: ${r.destination.country}`,
        description: `${r.employeeName} is in a high-risk destination`,
        href: "/travel-watch",
        type: "risk",
        isUrgent: true,
      });
    });

  // Employee: status changes on own requests
  if (role === "employee" && currentUser?.id) {
    requests
      .filter(r => r.employeeId === currentUser.id && ["approved", "rejected", "ticketed"].includes(r.status))
      .slice(0, 3)
      .forEach(r => {
        const titles: Record<string, string> = {
          approved: "Your trip has been approved",
          rejected: "Your trip request was rejected",
          ticketed: "Your trip has been ticketed",
        };
        all.push({
          id: `status-${r.id}-${r.status}`,
          title: titles[r.status] || "Request status updated",
          description: `${r.destination.city}, ${r.destination.country}`,
          href: `/requests/${r.id}`,
          type: "status",
          isUrgent: r.status === "rejected",
        });
      });
  }

  const unread = all.filter(n => !dismissed.includes(n.id));
  const unreadCount = unread.length;

  const dismiss = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  }, [dismissed]);

  const markAllRead = useCallback(() => {
    const next = all.map(n => n.id);
    setDismissed(next);
    saveDismissed(next);
  }, [all]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-foreground hover:bg-white/10"
          data-testid="button-notifications"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-white leading-none"
              data-testid="notification-badge"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">({unreadCount} new)</span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2 text-muted-foreground"
              onClick={markAllRead}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Body */}
        {unread.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs mt-0.5">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div>
              {unread.map((n, i) => {
                const Icon = iconFor(n.type);
                const color = colorFor(n.type, n.isUrgent);
                return (
                  <div
                    key={n.id}
                    className={`relative flex items-start gap-3 px-4 py-3 ${i < unread.length - 1 ? "border-b" : ""}`}
                    data-testid={`notification-item-${n.id}`}
                  >
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 flex-1 min-w-0 hover-elevate rounded pr-2"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => dismiss(n.id, e)}
                      className="shrink-0 mt-2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Dismiss notification"
                      data-testid={`button-dismiss-${n.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
