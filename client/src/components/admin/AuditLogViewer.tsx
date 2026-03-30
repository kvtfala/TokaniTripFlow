import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Download, Plus, Pencil, Trash2 } from "lucide-react";

type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  userId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  fieldChanges: Record<string, unknown> | null;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

const entityTypes = [
  "vendor",
  "email_template",
  "per_diem_rate",
  "travel_policy",
  "workflow_rule",
  "system_notification",
];

const actions = ["create", "update", "delete"];

export function AuditLogViewer() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (entityTypeFilter !== "all" && log.entityType !== entityTypeFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (userFilter && !log.userId.toLowerCase().includes(userFilter.toLowerCase())) return false;
    return true;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create": return <Plus className="w-4 h-4" />;
      case "update": return <Pencil className="w-4 h-4" />;
      case "delete": return <Trash2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const getActionVariant = (action: string): "default" | "destructive" | "secondary" => {
    switch (action) {
      case "create": return "default";
      case "delete": return "destructive";
      default: return "secondary";
    }
  };

  const formatEntityType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Entity Type", "Action", "User", "Entity ID"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      formatEntityType(log.entityType),
      log.action,
      log.userId,
      log.entityId,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between flex-wrap">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Entity:</span>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-48" data-testid="select-entity-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatEntityType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Action:</span>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-32" data-testid="select-action-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">User:</span>
            <Input
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-48"
              data-testid="input-user-filter"
            />
          </div>
        </div>

        <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Changes</CardDescription>
            <CardTitle className="text-2xl">{filteredLogs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Creates</CardDescription>
            <CardTitle className="text-2xl">
              {filteredLogs.filter(l => l.action === "create").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Updates</CardDescription>
            <CardTitle className="text-2xl">
              {filteredLogs.filter(l => l.action === "update").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deletes</CardDescription>
            <CardTitle className="text-2xl">
              {filteredLogs.filter(l => l.action === "delete").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                  <TableCell className="text-sm font-mono">
                    {format(new Date(log.timestamp), "dd MMM yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatEntityType(log.entityType)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionVariant(log.action)} className="gap-1">
                      {getActionIcon(log.action)}
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.userId}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.entityId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={viewingLog?.id === log.id} onOpenChange={(open) => !open && setViewingLog(null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingLog(log)}
                          data-testid={`button-view-${log.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Audit Log Details</DialogTitle>
                          <DialogDescription>
                            Change details for {formatEntityType(log.entityType)} - {log.action}
                          </DialogDescription>
                        </DialogHeader>
                        <AuditLogDetails log={log} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AuditLogDetails({ log }: { log: AuditLog }) {
  return (
    <div className="space-y-4">
      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Entity Type:</span>
          <div className="font-medium">{log.entityType}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Entity ID:</span>
          <div className="font-mono text-xs">{log.entityId}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Action:</span>
          <div className="font-medium capitalize">{log.action}</div>
        </div>
        <div>
          <span className="text-muted-foreground">User:</span>
          <div className="font-medium">{log.userId}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Timestamp:</span>
          <div className="font-mono text-xs">
            {format(new Date(log.timestamp), "dd MMM yyyy HH:mm:ss")}
          </div>
        </div>
        {log.ipAddress && (
          <div>
            <span className="text-muted-foreground">IP Address:</span>
            <div className="font-mono text-xs">{log.ipAddress}</div>
          </div>
        )}
      </div>

      {/* Field Changes */}
      {log.fieldChanges && Object.keys(log.fieldChanges).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Field Changes</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Previous Value</TableHead>
                  <TableHead>New Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(log.fieldChanges).map(([field, change]: [string, any]) => (
                  <TableRow key={field}>
                    <TableCell className="font-medium">{field}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <pre className="font-mono text-xs">{JSON.stringify(change.from, null, 2)}</pre>
                    </TableCell>
                    <TableCell className="text-sm">
                      <pre className="font-mono text-xs">{JSON.stringify(change.to, null, 2)}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Full Snapshots */}
      <div className="grid grid-cols-2 gap-4">
        {log.previousValue && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Previous Value</h4>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(log.previousValue, null, 2)}
            </pre>
          </div>
        )}
        <div>
          <h4 className="text-sm font-semibold mb-2">New Value</h4>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
            {JSON.stringify(log.newValue, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
