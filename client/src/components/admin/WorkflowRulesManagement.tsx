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
import { Plus, Pencil, Trash2, Info } from "lucide-react";

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

const PRESET_TEMPLATES = {
  twoStageApproval: {
    name: "Two-Stage Approval",
    description: "Manager approval followed by finance approval for trips over $5000",
    triggerConditions: '{"type": "cost_threshold", "value": 5000}',
    stages: JSON.stringify([
      { stage: 1, role: "manager", approvalRequired: true },
      { stage: 2, role: "finance_admin", approvalRequired: true }
    ], null, 2),
    escalationPath: '{"timeout_hours": 48, "escalate_to": "super_admin"}',
  },
  singleApproval: {
    name: "Single Approval",
    description: "Manager approval only for trips under $5000",
    triggerConditions: '{"type": "cost_threshold", "value": 5000, "operator": "less_than"}',
    stages: JSON.stringify([
      { stage: 1, role: "manager", approvalRequired: true }
    ], null, 2),
    escalationPath: '{"timeout_hours": 24, "escalate_to": "manager"}',
  },
};

const workflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().min(1, "Description is required"),
  triggerConditions: z.string().min(1, "Trigger conditions are required").refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Must be valid JSON"),
  stages: z.string().min(1, "Stages are required").refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }, "Must be valid JSON array"),
  escalationPath: z.string().optional().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Must be valid JSON or empty"),
  isActive: z.boolean().default(true),
});

type WorkflowFormValues = z.infer<typeof workflowSchema>;

export function WorkflowRulesManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowRule | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch workflow rules
  const { data: workflows = [], isLoading } = useQuery<WorkflowRule[]>({
    queryKey: ["/api/admin/workflow-rules"],
  });

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: async (data: WorkflowFormValues) => {
      try {
        const payload = {
          ...data,
          triggerConditions: JSON.parse(data.triggerConditions),
          stages: JSON.parse(data.stages),
          escalationPath: data.escalationPath ? JSON.parse(data.escalationPath) : null,
          createdBy: currentUser?.id || "system",
        };
        return await apiRequest("POST", "/api/admin/workflow-rules", payload);
      } catch (error) {
        throw new Error("Invalid JSON in workflow configuration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflow-rules"] });
      setIsCreateOpen(false);
      toast({
        title: "Workflow created",
        description: "Workflow rule has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow rule.",
        variant: "destructive",
      });
    },
  });

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        return await apiRequest("PATCH", `/api/admin/workflow-rules/${id}`, data);
      } catch (error) {
        throw new Error("Invalid JSON in workflow configuration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflow-rules"] });
      setEditingWorkflow(null);
      toast({
        title: "Workflow updated",
        description: "Workflow rule has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow rule.",
        variant: "destructive",
      });
    },
  });

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/workflow-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflow-rules"] });
      setDeletingWorkflow(null);
      toast({
        title: "Workflow deleted",
        description: "Workflow rule has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete workflow rule.",
        variant: "destructive",
      });
    },
  });

  // Filter workflows
  const filteredWorkflows = statusFilter === "all"
    ? workflows
    : workflows.filter(w => statusFilter === "active" ? w.isActive : !w.isActive);

  const handleToggleActive = (workflow: WorkflowRule) => {
    updateMutation.mutate({
      id: workflow.id,
      data: { isActive: !workflow.isActive },
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Library Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4" />
            Workflow Templates
          </CardTitle>
          <CardDescription>
            Use these preset templates as starting points for common approval workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
              <Card key={key} className="p-3">
                <h4 className="font-medium text-sm">{template.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

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
              onSubmit={(values) => createMutation.mutate(values)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflows Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading workflow rules...
                </TableCell>
              </TableRow>
            ) : filteredWorkflows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No workflow rules found.
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkflows.map((workflow) => (
                <TableRow key={workflow.id} data-testid={`row-workflow-${workflow.id}`}>
                  <TableCell className="font-medium">
                    <div>{workflow.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {workflow.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {Array.isArray(workflow.stages) ? workflow.stages.length : 0} stages
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workflow.triggerConditions?.type || "N/A"}
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
                            size="sm"
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
                            <DialogDescription>
                              Update the workflow configuration.
                            </DialogDescription>
                          </DialogHeader>
                          <WorkflowForm
                            defaultValues={{
                              name: workflow.name,
                              description: workflow.description,
                              triggerConditions: JSON.stringify(workflow.triggerConditions, null, 2),
                              stages: JSON.stringify(workflow.stages, null, 2),
                              escalationPath: workflow.escalationPath ? JSON.stringify(workflow.escalationPath, null, 2) : "",
                              isActive: workflow.isActive,
                            }}
                            onSubmit={(values) => {
                              try {
                                const payload = {
                                  ...values,
                                  triggerConditions: JSON.parse(values.triggerConditions),
                                  stages: JSON.parse(values.stages),
                                  escalationPath: values.escalationPath ? JSON.parse(values.escalationPath) : null,
                                };
                                updateMutation.mutate({ id: workflow.id, data: payload });
                              } catch (error) {
                                toast({
                                  title: "Invalid JSON",
                                  description: "Please check your JSON configuration.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingWorkflow} onOpenChange={() => setDeletingWorkflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingWorkflow?.name}"?
              This action cannot be undone.
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
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<WorkflowFormValues>;
  onSubmit: (values: WorkflowFormValues) => void;
  isPending: boolean;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
      triggerConditions: '{"type": "cost_threshold", "value": 5000}',
      stages: JSON.stringify([
        { stage: 1, role: "manager", approvalRequired: true }
      ], null, 2),
      escalationPath: '{"timeout_hours": 24, "escalate_to": "manager"}',
      isActive: true,
    },
  });

  const loadTemplate = (templateKey: string) => {
    if (!templateKey) return;
    const template = PRESET_TEMPLATES[templateKey as keyof typeof PRESET_TEMPLATES];
    if (template) {
      form.setValue("name", template.name);
      form.setValue("description", template.description);
      form.setValue("triggerConditions", template.triggerConditions);
      form.setValue("stages", template.stages);
      form.setValue("escalationPath", template.escalationPath);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Template Selector */}
        {!defaultValues && (
          <div className="bg-muted p-4 rounded-lg">
            <label className="text-sm font-medium mb-2 block">Load from Template</label>
            <Select value={selectedTemplate} onValueChange={(val) => { setSelectedTemplate(val); loadTemplate(val); }}>
              <SelectTrigger data-testid="select-template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workflow Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Standard Approval Flow"
                    data-testid="input-name"
                  />
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
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe when this workflow applies..."
                  rows={2}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="triggerConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trigger Conditions (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='{"type": "cost_threshold", "value": 5000}'
                  rows={4}
                  className="font-mono text-xs"
                  data-testid="input-trigger-conditions"
                />
              </FormControl>
              <FormDescription>
                JSON defining when this workflow triggers
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stages"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Approval Stages (JSON Array)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='[{"stage": 1, "role": "manager", "approvalRequired": true}]'
                  rows={8}
                  className="font-mono text-xs"
                  data-testid="input-stages"
                />
              </FormControl>
              <FormDescription>
                JSON array defining the approval stages and roles
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="escalationPath"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Escalation Path (JSON, Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='{"timeout_hours": 24, "escalate_to": "manager"}'
                  rows={4}
                  className="font-mono text-xs"
                  data-testid="input-escalation-path"
                />
              </FormControl>
              <FormDescription>
                JSON defining escalation rules (leave blank if none)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending ? "Saving..." : "Save Workflow"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
