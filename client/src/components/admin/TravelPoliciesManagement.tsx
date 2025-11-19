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
import { Plus, Pencil, Trash2 } from "lucide-react";

type TravelPolicy = {
  id: string;
  name: string;
  description: string;
  conditions: any;
  actions: any;
  priority: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  requiresCompliance: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const policySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().min(1, "Description is required"),
  conditions: z.string().min(1, "Conditions are required"),
  actions: z.string().min(1, "Actions are required"),
  priority: z.string().min(1, "Priority is required"),
  isActive: z.boolean().default(true),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  effectiveTo: z.string().optional(),
  requiresCompliance: z.boolean().default(false),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export function TravelPoliciesManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<TravelPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<TravelPolicy | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch policies
  const { data: policies = [], isLoading } = useQuery<TravelPolicy[]>({
    queryKey: ["/api/admin/travel-policies"],
  });

  // Create policy mutation
  const createMutation = useMutation({
    mutationFn: async (data: PolicyFormValues) => {
      const payload = {
        ...data,
        priority: parseInt(data.priority),
        conditions: JSON.parse(data.conditions),
        actions: JSON.parse(data.actions),
        createdBy: currentUser?.id || "system",
      };
      return await apiRequest("POST", "/api/admin/travel-policies", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travel-policies"] });
      setIsCreateOpen(false);
      toast({
        title: "Policy created",
        description: "Travel policy has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create travel policy.",
        variant: "destructive",
      });
    },
  });

  // Update policy mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/admin/travel-policies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travel-policies"] });
      setEditingPolicy(null);
      toast({
        title: "Policy updated",
        description: "Travel policy has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update travel policy.",
        variant: "destructive",
      });
    },
  });

  // Delete policy mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/travel-policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travel-policies"] });
      setDeletingPolicy(null);
      toast({
        title: "Policy deleted",
        description: "Travel policy has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete travel policy.",
        variant: "destructive",
      });
    },
  });

  // Filter policies
  const filteredPolicies = statusFilter === "all"
    ? policies
    : policies.filter(p => statusFilter === "active" ? p.isActive : !p.isActive);

  const handleToggleActive = (policy: TravelPolicy) => {
    updateMutation.mutate({
      id: policy.id,
      data: { isActive: !policy.isActive },
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-policy">
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Travel Policy</DialogTitle>
              <DialogDescription>
                Define a new policy with conditions and actions.
              </DialogDescription>
            </DialogHeader>
            <PolicyForm
              onSubmit={(values) => createMutation.mutate(values)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Policies Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Effective Period</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading policies...
                </TableCell>
              </TableRow>
            ) : filteredPolicies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No travel policies found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPolicies.map((policy) => (
                <TableRow key={policy.id} data-testid={`row-policy-${policy.id}`}>
                  <TableCell className="font-medium">
                    <div>{policy.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {policy.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{policy.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(policy.effectiveFrom), "dd MMM yyyy")}
                    {policy.effectiveTo && (
                      <> - {format(new Date(policy.effectiveTo), "dd MMM yyyy")}</>
                    )}
                  </TableCell>
                  <TableCell>
                    {policy.requiresCompliance && (
                      <Badge variant="secondary">Required</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.isActive ? "default" : "secondary"} data-testid={`badge-status-${policy.id}`}>
                      {policy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(policy)}
                        data-testid={`button-toggle-${policy.id}`}
                        disabled={updateMutation.isPending}
                      >
                        {policy.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Dialog open={editingPolicy?.id === policy.id} onOpenChange={(open) => !open && setEditingPolicy(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPolicy(policy)}
                            data-testid={`button-edit-${policy.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Travel Policy</DialogTitle>
                            <DialogDescription>
                              Update the policy configuration.
                            </DialogDescription>
                          </DialogHeader>
                          <PolicyForm
                            defaultValues={{
                              name: policy.name,
                              description: policy.description,
                              conditions: JSON.stringify(policy.conditions, null, 2),
                              actions: JSON.stringify(policy.actions, null, 2),
                              priority: policy.priority.toString(),
                              isActive: policy.isActive,
                              effectiveFrom: format(new Date(policy.effectiveFrom), "yyyy-MM-dd"),
                              effectiveTo: policy.effectiveTo ? format(new Date(policy.effectiveTo), "yyyy-MM-dd") : "",
                              requiresCompliance: policy.requiresCompliance,
                            }}
                            onSubmit={(values) => {
                              const payload = {
                                ...values,
                                priority: parseInt(values.priority),
                                conditions: JSON.parse(values.conditions),
                                actions: JSON.parse(values.actions),
                              };
                              updateMutation.mutate({ id: policy.id, data: payload });
                            }}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingPolicy(policy)}
                        data-testid={`button-delete-${policy.id}`}
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
      <AlertDialog open={!!deletingPolicy} onOpenChange={() => setDeletingPolicy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Travel Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPolicy?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPolicy && deleteMutation.mutate(deletingPolicy.id)}
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

function PolicyForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<PolicyFormValues>;
  onSubmit: (values: PolicyFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
      conditions: '{"type": "AND", "rules": []}',
      actions: '{"type": "require_approval", "approver_role": "manager"}',
      priority: "100",
      isActive: true,
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      effectiveTo: "",
      requiresCompliance: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., International Travel Approval"
                  data-testid="input-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe when this policy applies..."
                  rows={2}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="conditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conditions (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='{"type": "AND", "rules": []}'
                    rows={6}
                    className="font-mono text-xs"
                    data-testid="input-conditions"
                  />
                </FormControl>
                <FormDescription>
                  JSON format for policy conditions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="actions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actions (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder='{"type": "require_approval"}'
                    rows={6}
                    className="font-mono text-xs"
                    data-testid="input-actions"
                  />
                </FormControl>
                <FormDescription>
                  JSON format for policy actions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    placeholder="100"
                    data-testid="input-priority"
                  />
                </FormControl>
                <FormDescription>
                  Higher = earlier evaluation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective From</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid="input-effective-from"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="effectiveTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective To (Optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid="input-effective-to"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-6">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    data-testid="checkbox-active"
                    className="h-4 w-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiresCompliance"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    data-testid="checkbox-compliance"
                    className="h-4 w-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Requires Compliance</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending ? "Saving..." : "Save Policy"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
