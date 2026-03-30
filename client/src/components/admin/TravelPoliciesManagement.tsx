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
import { Plus, Pencil, Trash2, X } from "lucide-react";

type TravelPolicy = {
  id: string;
  name: string;
  description: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  requiresCompliance: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const CONDITION_FIELDS = [
  { value: "destination", label: "Destination" },
  { value: "budget", label: "Budget (FJD)" },
  { value: "travel_mode", label: "Travel Mode" },
  { value: "department", label: "Department" },
  { value: "duration_days", label: "Duration (Days)" },
  { value: "trip_type", label: "Trip Type" },
  { value: "is_international", label: "Is International" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
];

const ACTION_TYPES = [
  { value: "require_approval", label: "Require Approval" },
  { value: "block_submission", label: "Block Submission" },
  { value: "notify", label: "Send Notification" },
  { value: "flag_for_review", label: "Flag for Review" },
  { value: "require_documentation", label: "Require Documentation" },
];

const APPROVER_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "finance_admin", label: "Finance Admin" },
  { value: "travel_admin", label: "Travel Admin" },
  { value: "super_admin", label: "Super Admin" },
];

type PolicyCondition = {
  field: string;
  operator: string;
  value: string;
};

type PolicyAction = {
  type: string;
  approverRole?: string;
  message?: string;
};

const policyBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().min(1, "Description is required"),
  priority: z.string().min(1, "Priority is required"),
  isActive: z.boolean().default(true),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  effectiveTo: z.string().optional(),
  requiresCompliance: z.boolean().default(false),
});

type PolicyBaseValues = z.infer<typeof policyBaseSchema>;

export function TravelPoliciesManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<TravelPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<TravelPolicy | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: policies = [], isLoading } = useQuery<TravelPolicy[]>({
    queryKey: ["/api/admin/policies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => apiRequest("POST", "/api/admin/policies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
      setIsCreateOpen(false);
      toast({ title: "Policy created", description: "Travel policy has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create travel policy.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/admin/policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
      setEditingPolicy(null);
      toast({ title: "Policy updated", description: "Travel policy has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update travel policy.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
      setDeletingPolicy(null);
      toast({ title: "Policy deleted", description: "Travel policy has been deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete travel policy.", variant: "destructive" });
    },
  });

  const filteredPolicies = statusFilter === "all"
    ? policies
    : policies.filter(p => statusFilter === "active" ? p.isActive : !p.isActive);

  const handleToggleActive = (policy: TravelPolicy) => {
    updateMutation.mutate({ id: policy.id, data: { isActive: !policy.isActive } });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredPolicies.map(p => p.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("DELETE", `/api/admin/policies/${id}`);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} policies deleted` });
  };

  const handleBulkActivate = async (isActive: boolean) => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("PATCH", `/api/admin/policies/${id}`, { isActive });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} policies ${isActive ? "activated" : "deactivated"}` });
  };

  return (
    <div className="space-y-6">
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
              <DialogDescription>Define a new policy with conditions and actions.</DialogDescription>
            </DialogHeader>
            <PolicyForm
              onSubmit={(payload) => createMutation.mutate({ ...payload, createdBy: currentUser?.id || "system" })}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredPolicies.length > 0 && selectedIds.size === filteredPolicies.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground">Loading policies...</TableCell>
              </TableRow>
            ) : filteredPolicies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No travel policies found.</TableCell>
              </TableRow>
            ) : (
              filteredPolicies.map((policy) => (
                <TableRow key={policy.id} data-testid={`row-policy-${policy.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(policy.id)}
                      onCheckedChange={(checked) => handleSelectRow(policy.id, !!checked)}
                      data-testid={`checkbox-${policy.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{policy.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{policy.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{policy.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {policy.effectiveFrom ? format(new Date(policy.effectiveFrom), "dd MMM yyyy") : "—"}
                    {policy.effectiveTo ? <> - {format(new Date(policy.effectiveTo), "dd MMM yyyy")}</> : null}
                  </TableCell>
                  <TableCell>
                    {policy.requiresCompliance && <Badge variant="secondary">Required</Badge>}
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
                            size="icon"
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
                            <DialogDescription>Update the policy configuration.</DialogDescription>
                          </DialogHeader>
                          <PolicyForm
                            existingPolicy={policy}
                            onSubmit={(payload) => updateMutation.mutate({ id: policy.id, data: payload })}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="icon"
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border rounded-xl px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkActivate(true)} data-testid="button-bulk-activate">Activate</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkActivate(false)} data-testid="button-bulk-deactivate">Deactivate</Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} data-testid="button-bulk-delete">Delete</Button>
          <Button size="icon" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <AlertDialog open={!!deletingPolicy} onOpenChange={() => setDeletingPolicy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Travel Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPolicy?.name}"? This action cannot be undone.
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

function parseConditions(raw: unknown): PolicyCondition[] {
  try {
    if (!raw || typeof raw !== "object") return [{ field: "budget", operator: "greater_than", value: "5000" }];
    const r = raw as Record<string, unknown>;
    if (r.rules && Array.isArray(r.rules)) {
      return (r.rules as Record<string, unknown>[]).map((rule) => ({
        field: typeof rule.field === "string" ? rule.field : "budget",
        operator: typeof rule.operator === "string" ? rule.operator : "greater_than",
        value: rule.value !== undefined ? String(rule.value) : "",
      }));
    }
    return [{ field: "budget", operator: "greater_than", value: "5000" }];
  } catch {
    return [{ field: "budget", operator: "greater_than", value: "5000" }];
  }
}

function parseAction(raw: unknown): PolicyAction {
  try {
    if (!raw || typeof raw !== "object") return { type: "require_approval", approverRole: "manager" };
    const r = raw as Record<string, unknown>;
    return {
      type: typeof r.type === "string" ? r.type : "require_approval",
      approverRole: typeof r.approver_role === "string" ? r.approver_role : undefined,
      message: typeof r.message === "string" ? r.message : undefined,
    };
  } catch {
    return { type: "require_approval", approverRole: "manager" };
  }
}

function PolicyForm({
  existingPolicy,
  onSubmit,
  isPending,
}: {
  existingPolicy?: TravelPolicy;
  onSubmit: (payload: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const form = useForm<PolicyBaseValues>({
    resolver: zodResolver(policyBaseSchema),
    defaultValues: {
      name: existingPolicy?.name || "",
      description: existingPolicy?.description || "",
      priority: existingPolicy?.priority?.toString() || "100",
      isActive: existingPolicy?.isActive ?? true,
      effectiveFrom: existingPolicy?.effectiveFrom
        ? (() => { try { return format(new Date(existingPolicy.effectiveFrom), "yyyy-MM-dd"); } catch { return format(new Date(), "yyyy-MM-dd"); } })()
        : format(new Date(), "yyyy-MM-dd"),
      effectiveTo: existingPolicy?.effectiveTo
        ? (() => { try { return format(new Date(existingPolicy.effectiveTo!), "yyyy-MM-dd"); } catch { return ""; } })()
        : "",
      requiresCompliance: existingPolicy?.requiresCompliance ?? false,
    },
  });

  const [conditions, setConditions] = useState<PolicyCondition[]>(
    parseConditions(existingPolicy?.conditions)
  );
  const [action, setAction] = useState<PolicyAction>(parseAction(existingPolicy?.actions));

  const addCondition = () => {
    setConditions(prev => [...prev, { field: "budget", operator: "greater_than", value: "" }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: keyof PolicyCondition, value: string) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleFormSubmit = (values: PolicyBaseValues) => {
    const conditionsPayload = {
      type: "AND",
      rules: conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: isNaN(Number(c.value)) ? c.value : Number(c.value),
      })),
    };

    const actionsPayload: Record<string, unknown> = { type: action.type };
    if (action.approverRole) actionsPayload.approver_role = action.approverRole;
    if (action.message) actionsPayload.message = action.message;

    onSubmit({
      ...values,
      priority: parseInt(values.priority),
      conditions: conditionsPayload,
      actions: actionsPayload,
    });
  };

  const showApproverRole = action.type === "require_approval";
  const showMessage = action.type === "notify" || action.type === "block";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., International Travel Approval" data-testid="input-name" />
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
                <Textarea {...field} placeholder="Describe when this policy applies..." rows={2} data-testid="input-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditions Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">IF — Conditions</label>
              <p className="text-xs text-muted-foreground mt-0.5">All conditions must match (AND logic)</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addCondition} data-testid="button-add-condition">
              <Plus className="w-3 h-3 mr-1" /> Add Condition
            </Button>
          </div>
          <div className="space-y-2">
            {conditions.map((condition, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                {idx > 0 && (
                  <span className="text-xs font-medium text-muted-foreground w-8 flex-shrink-0">AND</span>
                )}
                {idx === 0 && (
                  <span className="text-xs font-medium text-muted-foreground w-8 flex-shrink-0">IF</span>
                )}
                <Select value={condition.field} onValueChange={(v) => updateCondition(idx, "field", v)}>
                  <SelectTrigger className="flex-1 h-8 text-sm" data-testid={`select-condition-field-${idx}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_FIELDS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={condition.operator} onValueChange={(v) => updateCondition(idx, "operator", v)}>
                  <SelectTrigger className="flex-1 h-8 text-sm" data-testid={`select-condition-op-${idx}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1 h-8 text-sm"
                  value={condition.value}
                  onChange={(e) => updateCondition(idx, "value", e.target.value)}
                  placeholder="value"
                  data-testid={`input-condition-value-${idx}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCondition(idx)}
                  disabled={conditions.length === 1}
                  className="flex-shrink-0"
                  data-testid={`button-remove-condition-${idx}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Builder */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">THEN — Action</label>
            <p className="text-xs text-muted-foreground mt-0.5">What should happen when conditions are met?</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Action Type</label>
              <Select value={action.type} onValueChange={(v) => setAction(prev => ({ ...prev, type: v }))}>
                <SelectTrigger data-testid="select-action-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showApproverRole && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Approver Role</label>
                <Select
                  value={action.approverRole || "manager"}
                  onValueChange={(v) => setAction(prev => ({ ...prev, approverRole: v }))}
                >
                  <SelectTrigger data-testid="select-approver-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVER_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showMessage && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Message (optional)</label>
                <Input
                  value={action.message || ""}
                  onChange={(e) => setAction(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Reason or notification message..."
                  data-testid="input-action-message"
                />
              </div>
            )}
          </div>
        </div>

        {/* Date and Priority */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="1" placeholder="100" data-testid="input-priority" />
                </FormControl>
                <FormDescription>Higher = earlier evaluation</FormDescription>
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
                  <Input {...field} type="date" data-testid="input-effective-from" />
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
                  <Input {...field} type="date" data-testid="input-effective-to" />
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
                  <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4" data-testid="checkbox-active" />
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
                  <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4" data-testid="checkbox-compliance" />
                </FormControl>
                <FormLabel className="!mt-0">Requires Compliance</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-policy">
            {isPending ? "Saving..." : existingPolicy ? "Update Policy" : "Create Policy"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
