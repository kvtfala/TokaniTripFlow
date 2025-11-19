import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Send, AlertTriangle, Info as InfoIcon, AlertCircle } from "lucide-react";

type SystemNotification = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  targetRoles: string[] | null;
  targetUsers: string[] | null;
  isPublished: boolean;
  isDismissible: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const severities = ["info", "warning", "critical"];
const allRoles = ["employee", "coordinator", "manager", "finance_admin", "travel_admin"];

const notificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  message: z.string().min(1, "Message is required"),
  severity: z.enum(severities as [string, ...string[]]),
  targetRoles: z.string().optional(), // Comma-separated
  targetUsers: z.string().optional(), // Comma-separated
  isPublished: z.boolean().default(false),
  isDismissible: z.boolean().default(true),
  expiresAt: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export function SystemNotificationsManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<SystemNotification | null>(null);
  const [deletingNotification, setDeletingNotification] = useState<SystemNotification | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [publishedFilter, setPublishedFilter] = useState<string>("all");

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<SystemNotification[]>({
    queryKey: ["/api/admin/system-notifications"],
  });

  // Create notification mutation
  const createMutation = useMutation({
    mutationFn: async (data: NotificationFormValues) => {
      const payload = {
        ...data,
        targetRoles: data.targetRoles ? data.targetRoles.split(',').map(s => s.trim()) : null,
        targetUsers: data.targetUsers ? data.targetUsers.split(',').map(s => s.trim()) : null,
        createdBy: currentUser?.id || "system",
        publishedAt: data.isPublished ? new Date().toISOString() : null,
      };
      return await apiRequest("POST", "/api/admin/system-notifications", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-notifications"] });
      setIsCreateOpen(false);
      toast({
        title: "Notification created",
        description: "System notification has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create system notification.",
        variant: "destructive",
      });
    },
  });

  // Update notification mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/admin/system-notifications/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-notifications"] });
      setEditingNotification(null);
      toast({
        title: "Notification updated",
        description: "System notification has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update system notification.",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/system-notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-notifications"] });
      setDeletingNotification(null);
      toast({
        title: "Notification deleted",
        description: "System notification has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete system notification.",
        variant: "destructive",
      });
    },
  });

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (severityFilter !== "all" && n.severity !== severityFilter) return false;
    if (publishedFilter === "published" && !n.isPublished) return false;
    if (publishedFilter === "draft" && n.isPublished) return false;
    return true;
  });

  const handleTogglePublish = (notification: SystemNotification) => {
    const newIsPublished = !notification.isPublished;
    updateMutation.mutate({
      id: notification.id,
      data: {
        isPublished: newIsPublished,
        publishedAt: newIsPublished ? new Date().toISOString() : null,
      },
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="w-4 h-4" />;
      case "warning": return <AlertCircle className="w-4 h-4" />;
      default: return <InfoIcon className="w-4 h-4" />;
    }
  };

  const getSeverityVariant = (severity: string): "destructive" | "default" | "secondary" => {
    switch (severity) {
      case "critical": return "destructive";
      case "warning": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Severity:</span>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32" data-testid="select-severity-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {severities.map(sev => (
                  <SelectItem key={sev} value={sev}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={publishedFilter} onValueChange={setPublishedFilter}>
              <SelectTrigger className="w-32" data-testid="select-published-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-notification">
              <Plus className="w-4 h-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create System Notification</DialogTitle>
              <DialogDescription>
                Create a new notification to display to users based on roles and expiry dates.
              </DialogDescription>
            </DialogHeader>
            <NotificationForm
              onSubmit={(values) => createMutation.mutate(values)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Notifications Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading notifications...
                </TableCell>
              </TableRow>
            ) : filteredNotifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No system notifications found.
                </TableCell>
              </TableRow>
            ) : (
              filteredNotifications.map((notification) => (
                <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate">{notification.title}</div>
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {notification.message}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(notification.severity)} className="gap-1">
                      {getSeverityIcon(notification.severity)}
                      {notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {notification.targetRoles && notification.targetRoles.length > 0 ? (
                      <div>Roles: {notification.targetRoles.join(', ')}</div>
                    ) : notification.targetUsers && notification.targetUsers.length > 0 ? (
                      <div>Users: {notification.targetUsers.length}</div>
                    ) : (
                      <div>All Users</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={notification.isPublished ? "default" : "secondary"} data-testid={`badge-status-${notification.id}`}>
                      {notification.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {notification.expiresAt ? format(new Date(notification.expiresAt), "dd MMM yyyy") : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePublish(notification)}
                        data-testid={`button-toggle-${notification.id}`}
                        disabled={updateMutation.isPending}
                      >
                        {notification.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Dialog open={editingNotification?.id === notification.id} onOpenChange={(open) => !open && setEditingNotification(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingNotification(notification)}
                            data-testid={`button-edit-${notification.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit System Notification</DialogTitle>
                            <DialogDescription>
                              Update the notification details.
                            </DialogDescription>
                          </DialogHeader>
                          <NotificationForm
                            defaultValues={{
                              title: notification.title,
                              message: notification.message,
                              severity: notification.severity,
                              targetRoles: notification.targetRoles?.join(', ') || "",
                              targetUsers: notification.targetUsers?.join(', ') || "",
                              isPublished: notification.isPublished,
                              isDismissible: notification.isDismissible,
                              expiresAt: notification.expiresAt ? format(new Date(notification.expiresAt), "yyyy-MM-dd'T'HH:mm") : "",
                            }}
                            onSubmit={(values) => {
                              const payload = {
                                ...values,
                                targetRoles: values.targetRoles ? values.targetRoles.split(',').map(s => s.trim()) : null,
                                targetUsers: values.targetUsers ? values.targetUsers.split(',').map(s => s.trim()) : null,
                                publishedAt: values.isPublished && !notification.isPublished ? new Date().toISOString() : notification.publishedAt,
                              };
                              updateMutation.mutate({ id: notification.id, data: payload });
                            }}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingNotification(notification)}
                        data-testid={`button-delete-${notification.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingNotification} onOpenChange={() => setDeletingNotification(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingNotification?.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingNotification && deleteMutation.mutate(deletingNotification.id)}
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotificationForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<NotificationFormValues>;
  onSubmit: (values: NotificationFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: defaultValues || {
      title: "",
      message: "",
      severity: "info",
      targetRoles: "",
      targetUsers: "",
      isPublished: false,
      isDismissible: true,
      expiresAt: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., System Maintenance Notice"
                  data-testid="input-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Detailed notification message..."
                  rows={4}
                  data-testid="input-message"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-severity">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {severities.map(sev => (
                      <SelectItem key={sev} value={sev}>
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expires At (Optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="datetime-local"
                    data-testid="input-expires-at"
                  />
                </FormControl>
                <FormDescription>
                  Leave blank to never expire
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="targetRoles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Roles (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., manager, finance_admin"
                  data-testid="input-target-roles"
                />
              </FormControl>
              <FormDescription>
                Comma-separated role names. Leave blank to show to all users.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetUsers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Users (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., user1, user2"
                  data-testid="input-target-users"
                />
              </FormControl>
              <FormDescription>
                Comma-separated user IDs. Takes precedence over role targeting.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-6">
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-published"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Publish Immediately</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDismissible"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-dismissible"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Allow Dismissal</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending ? "Saving..." : "Save Notification"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
