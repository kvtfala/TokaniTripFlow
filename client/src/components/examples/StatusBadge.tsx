import { StatusBadge } from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="p-8 space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Request Status</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="pending" type="request" />
          <StatusBadge status="approved" type="request" />
          <StatusBadge status="rejected" type="request" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Visa Status</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="OK" type="visa" />
          <StatusBadge status="WARNING" type="visa" />
          <StatusBadge status="ACTION" type="visa" />
        </div>
      </div>
    </div>
  );
}
