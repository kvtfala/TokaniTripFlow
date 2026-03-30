import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, UserX, Check } from "lucide-react";
import { format } from "date-fns";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  coordinator: "Coordinator",
  manager: "Manager",
  finance_admin: "Finance Admin",
  travel_admin: "Travel Admin",
  super_admin: "Super Admin",
};

const ROLE_OPTIONS = [
  "employee",
  "coordinator",
  "manager",
  "finance_admin",
  "travel_admin",
  "super_admin",
] as const;

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case "super_admin": return "default";
    case "finance_admin":
    case "travel_admin": return "secondary";
    default: return "outline";
  }
}

export function UserManagement() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingRole, setEditingRole] = useState<Record<string, string>>({});
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  const isSuperAdmin = currentUser.role === "super_admin";

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated", description: "Changes saved successfully." });
      setEditingRole({});
      setDeactivatingUser(null);
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
    const email = (u.email ?? "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    setEditingRole(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = (user: User) => {
    const newRole = editingRole[user.id];
    if (!newRole || newRole === user.role) return;
    updateMutation.mutate({ id: user.id, updates: { role: newRole } });
  };

  const handleDeactivate = (user: User) => {
    updateMutation.mutate({ id: user.id, updates: { isActive: false } });
  };

  const handleActivate = (user: User) => {
    updateMutation.mutate({ id: user.id, updates: { isActive: true } });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="space-y-4" data-testid="user-management">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Staff Directory</h3>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""} in your organisation
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-user-search"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => {
                const currentRole = editingRole[user.id] ?? user.role ?? "employee";
                const hasRoleChange = editingRole[user.id] && editingRole[user.id] !== user.role;
                const isSelf = user.id === currentUser.id;
                return (
                  <TableRow
                    key={user.id}
                    data-testid={`row-user-${user.id}`}
                    className={!user.isActive ? "opacity-50" : undefined}
                  >
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {isSuperAdmin && !isSelf ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={currentRole}
                            onValueChange={val => handleRoleChange(user.id, val)}
                            disabled={!user.isActive}
                          >
                            <SelectTrigger
                              className="w-36 h-8 text-sm"
                              data-testid={`select-role-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(r => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {hasRoleChange && (
                            <Button
                              size="icon"
                              variant="default"
                              onClick={() => handleSaveRole(user)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-role-${user.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(user.role ?? "employee")}>
                          {ROLE_LABELS[user.role ?? "employee"] ?? user.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLogin
                        ? format(new Date(user.lastLogin), "dd MMM yyyy HH:mm")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSuperAdmin && !isSelf && (
                        user.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeactivatingUser(user)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-deactivate-${user.id}`}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActivate(user)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-activate-${user.id}`}
                          >
                            Reactivate
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deactivatingUser} onOpenChange={() => setDeactivatingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{deactivatingUser?.firstName} {deactivatingUser?.lastName}</strong>?
              They will no longer be able to log in. You can reactivate them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivatingUser && handleDeactivate(deactivatingUser)}
              data-testid="button-confirm-deactivate"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
