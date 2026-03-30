import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Info, ArrowUp, ArrowDown, GripVertical, X } from "lucide-react";

type WorkflowRule = {
  id: string;
  name: string;
  description: string;
  triggerConditions: any;
  stages: any;
  escalationPath: any | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const CANONICAL_ROLES = [
  { value: "employee", label: "Employee" },
  { value: "coordinator", label: "Coordinator" },
  { value: "manager", label: "Manager" },
  { value: "finance_admin", label: "Finance Admin" },
  { value: "travel_admin", label: "Travel Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const TRIGGER_TYPES = [
  { value: "cost_threshold", label: "Cost Threshold" },
  { value: "international", label: "International Travel" },
  { value: "department", label: "Department" },
  { value: "duration", label: "Trip Duration (Days)" },
  { value: "always", label: "Always (All Trips)" },
];

const TRIGGER_OPERATORS = [
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "equals", label: "Equals" },
];

type ApprovalStage = {
  stage: number;
  role: string;
  userId?: string;
  timeoutHours?: number;
  approvalRequired: boolean;
};

type TriggerState = {
  type: string;
  operator?: string;
  value?: string | number;
};

type EscalationState = {
  timeoutHours: number;
  escalateTo: string;
};

const workflowBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().min(1, "Description is required"),
  isActive: z.boolean().default(true),
});

type WorkflowBaseValues = z.infer<typeof workflowBaseSchema>;

export function WorkflowRulesManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowRule | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: workflows = [], isLoading } = useQuery<WorkflowRule[]>({
    queryKey: ["/api/admin/workflows"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => apiRequest("POST", "/api/admin/workflows", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflows"] });
      setIsCreateOpen(false);
      toast({ title: "Workflow created", description: "Workflow rule has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create workflow rule.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/workflows/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflows"] });
      setEditingWorkflow(null);
      toast({ title: "Workflow updated", description: "Workflow rule has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update workflow rule.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflows"] });
      setDeletingWorkflow(null);
      toast({ title: "Workflow deleted", description: "Workflow rule has been deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete workflow rule.", variant: "destructive" });
    },
  });

  const filteredWorkflows = statusFilter === "all"
    ? workflows
    : workflows.filter(w => statusFilter === "active" ? w.isActive : !w.isActive);

  const handleToggleActive = (workflow: WorkflowRule) => {
    updateMutation.mutate({ id: workflow.id, data: { isActive: !workflow.isActive } });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredWorkflows.map(w => w.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("DELETE", `/api/admin/workflows/${id}`);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/workflows"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} workflows deleted` });
  };

  const handleBulkActivate = async (isActive: boolean) => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("PATCH", `/api/admin/workflows/${id}`, { isActive });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/workflows"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} workflows ${isActive ? "activated" : "deactivated"}` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4" />
            Workflow Templates
          </CardTitle>
          <CardDescription>
            Use preset templates as starting points for common approval workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-3">
              <h4 className="font-medium text-sm">Two-Stage Approval</h4>
              <p className="text-xs text-muted-foreground mt-1">Manager then finance approval for high-value trips</p>
            </Card>
            <Card className="p-3">
              <h4 className="font-medium text-sm">Single Approval</h4>
              <p className="text-xs text-muted-foreground mt-1">Manager approval only for standard trips</p>
            </Card>
          </div>
        </CardContent>
      </Card>

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
            <Button data-testid="button-create-workflow">
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Workflow Rule</DialogTitle>
              <DialogDescription>
                Define a multi-stage approval workflow with trigger conditions and escalation paths.
              </DialogDescription>
            </DialogHeader>
            <WorkflowForm
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
                  checked={filteredWorkflows.length > 0 && selectedIds.size === filteredWorkflows.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Stages</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Loading workflow rules...</TableCell>
              </TableRow>
            ) : filteredWorkflows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No workflow rules found.</TableCell>
              </TableRow>
            ) : (
              filteredWorkflows.map((workflow) => (
                <TableRow key={workflow.id} data-testid={`row-workflow-${workflow.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(workflow.id)}
                      onCheckedChange={(checked) => handleSelectRow(workflow.id, !!checked)}
                      data-testid={`checkbox-${workflow.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{workflow.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{workflow.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {Array.isArray(workflow.stages) ? workflow.stages.length : 0} stages
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workflow.triggerConditions?.type
                      ? TRIGGER_TYPES.find(t => t.value === workflow.triggerConditions.type)?.label || workflow.triggerConditions.type
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={workflow.isActive ? "default" : "secondary"} data-testid={`badge-status-${workflow.id}`}>
                      {workflow.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(workflow)}
                        data-testid={`button-toggle-${workflow.id}`}
                        disabled={updateMutation.isPending}
                      >
                        {workflow.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Dialog open={editingWorkflow?.id === workflow.id} onOpenChange={(open) => !open && setEditingWorkflow(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingWorkflow(workflow)}
                            data-testid={`button-edit-${workflow.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Workflow Rule</DialogTitle>
                            <DialogDescription>Update the workflow configuration.</DialogDescription>
                          </DialogHeader>
                          <WorkflowForm
                            existingWorkflow={workflow}
                            onSubmit={(payload) => updateMutation.mutate({ id: workflow.id, data: payload })}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingWorkflow(workflow)}
                        data-testid={`button-delete-${workflow.id}`}
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

      <AlertDialog open={!!deletingWorkflow} onOpenChange={() => setDeletingWorkflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingWorkflow?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingWorkflow && deleteMutation.mutate(deletingWorkflow.id)}
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

function WorkflowForm({
  existingWorkflow,
  onSubmit,
  isPending,
}: {
  existingWorkflow?: WorkflowRule;
  onSubmit: (payload: any) => void;
  isPending: boolean;
}) {
  const defaultStages: ApprovalStage[] = existingWorkflow?.stages && Array.isArray(existingWorkflow.stages)
    ? existingWorkflow.stages
    : [{ stage: 1, role: "manager", timeoutHours: 48, approvalRequired: true }];

  const defaultTrigger: TriggerState = existingWorkflow?.triggerConditions
    ? {
        type: existingWorkflow.triggerConditions.type || "cost_threshold",
        operator: existingWorkflow.triggerConditions.operator || "greater_than",
        value: existingWorkflow.triggerConditions.value?.toString() || "5000",
      }
    : { type: "cost_threshold", operator: "greater_than", value: "5000" };

  const defaultEscalation: EscalationState = existingWorkflow?.escalationPath
    ? {
        timeoutHours: existingWorkflow.escalationPath.timeout_hours || 48,
        escalateTo: existingWorkflow.escalationPath.escalate_to || "super_admin",
      }
    : { timeoutHours: 48, escalateTo: "super_admin" };

  const form = useForm<WorkflowBaseValues>({
    resolver: zodResolver(workflowBaseSchema),
    defaultValues: {
      name: existingWorkflow?.name || "",
      description: existingWorkflow?.description || "",
      isActive: existingWorkflow?.isActive ?? true,
    },
  });

  const [stages, setStages] = useState<ApprovalStage[]>(defaultStages);
  const [trigger, setTrigger] = useState<TriggerState>(defaultTrigger);
  const [escalation, setEscalation] = useState<EscalationState>(defaultEscalation);

  const addStage = () => {
    setStages(prev => [
      ...prev,
      { stage: prev.length + 1, role: "manager", timeoutHours: 48, approvalRequired: true },
    ]);
  };

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stage: i + 1 })));
  };

  const updateStage = (idx: number, field: keyof ApprovalStage, value: any) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const moveStage = (idx: number, direction: "up" | "down") => {
    const next = [...stages];
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setStages(next.map((s, i) => ({ ...s, stage: i + 1 })));
  };

  const handleFormSubmit = (values: WorkflowBaseValues) => {
    const triggerConditions: any = { type: trigger.type };
    if (trigger.type !== "always" && trigger.type !== "international") {
      triggerConditions.operator = trigger.operator || "greater_than";
      triggerConditions.value = isNaN(Number(trigger.value)) ? trigger.value : Number(trigger.value);
    }

    const payload = {
      ...values,
      triggerConditions,
      stages,
      escalationPath: {
        timeout_hours: escalation.timeoutHours,
        escalate_to: escalation.escalateTo,
      },
    };
    onSubmit(payload);
  };

  const needsValue = trigger.type !== "always" && trigger.type !== "international";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workflow Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Standard Approval Flow" data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                <FormControl>
                  <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4" data-testid="checkbox-active" />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Describe when this workflow applies..." rows={2} data-testid="input-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trigger Conditions */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Trigger Condition</label>
            <p className="text-xs text-muted-foreground mt-0.5">When should this workflow activate?</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select value={trigger.type} onValueChange={(v) => setTrigger(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger data-testid="select-trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsValue && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Operator</label>
                    <Select value={trigger.operator || "greater_than"} onValueChange={(v) => setTrigger(prev => ({ ...prev, operator: v }))}>
                      <SelectTrigger data-testid="select-trigger-operator">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {trigger.type === "cost_threshold" ? "Amount (FJD)" : trigger.type === "duration" ? "Days" : "Value"}
                    </label>
                    <Input
                      type={trigger.type === "department" ? "text" : "number"}
                      value={trigger.value?.toString() || ""}
                      onChange={(e) => setTrigger(prev => ({ ...prev, value: e.target.value }))}
                      placeholder={trigger.type === "cost_threshold" ? "5000" : trigger.type === "duration" ? "7" : "value"}
                      data-testid="input-trigger-value"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Approval Stages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Approval Stages</label>
              <p className="text-xs text-muted-foreground mt-0.5">Define who approves and in what order</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addStage} data-testid="button-add-stage">
              <Plus className="w-3 h-3 mr-1" /> Add Stage
            </Button>
          </div>
          <div className="space-y-2">
            {stages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <div className="flex flex-col gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveStage(idx, "up")} disabled={idx === 0}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveStage(idx, "down")} disabled={idx === stages.length - 1}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                  {stage.stage}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Role</label>
                    <Select
                      value={stage.role}
                      onValueChange={(v) => updateStage(idx, "role", v)}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid={`select-stage-role-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CANONICAL_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Specific User ID (opt.)</label>
                    <Input
                      className="h-8 text-sm"
                      value={stage.userId || ""}
                      onChange={(e) => updateStage(idx, "userId", e.target.value || undefined)}
                      placeholder="user_123 (optional)"
                      data-testid={`input-stage-user-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Timeout (hours)</label>
                    <Input
                      className="h-8 text-sm"
                      type="number"
                      min="1"
                      value={stage.timeoutHours || ""}
                      onChange={(e) => updateStage(idx, "timeoutHours", parseInt(e.target.value) || undefined)}
                      placeholder="48"
                      data-testid={`input-stage-timeout-${idx}`}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeStage(idx)}
                  disabled={stages.length === 1}
                  className="flex-shrink-0"
                  data-testid={`button-remove-stage-${idx}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation Path */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Escalation Path</label>
            <p className="text-xs text-muted-foreground mt-0.5">What happens if approval is not given in time?</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Escalate after (hours)</label>
                <Input
                  type="number"
                  min="1"
                  value={escalation.timeoutHours}
                  onChange={(e) => setEscalation(prev => ({ ...prev, timeoutHours: parseInt(e.target.value) || 48 }))}
                  placeholder="48"
                  data-testid="input-escalation-timeout"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Escalate to role</label>
                <Select
                  value={escalation.escalateTo}
                  onValueChange={(v) => setEscalation(prev => ({ ...prev, escalateTo: v }))}
                >
                  <SelectTrigger data-testid="select-escalation-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-workflow">
            {isPending ? "Saving..." : existingWorkflow ? "Update Workflow" : "Create Workflow"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
