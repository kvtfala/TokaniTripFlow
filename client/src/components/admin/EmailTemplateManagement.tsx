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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Info, Eye, X, Mail } from "lucide-react";

type EmailTemplate = {
  id: string;
  subject: string;
  body: string;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const emailCategories = [
  "approval_request",
  "approval_granted",
  "approval_denied",
  "trip_reminder",
  "expense_reminder",
  "visa_alert",
  "policy_update",
  "general",
];

const templateSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255),
  body: z.string().min(1, "Body is required"),
  category: z.enum(emailCategories as [string, ...string[]]),
  isActive: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const PLACEHOLDERS = [
  { key: "{{employee_name}}", description: "Traveller's full name", sample: "Jone Ratudina" },
  { key: "{{employee_number}}", description: "Employee number", sample: "EMP-0042" },
  { key: "{{trip_reference}}", description: "Trip reference number", sample: "TTF-2024-0142" },
  { key: "{{destination}}", description: "Destination city/country", sample: "Sydney, Australia" },
  { key: "{{departure_date}}", description: "Departure date", sample: "15 Apr 2024" },
  { key: "{{return_date}}", description: "Return date", sample: "22 Apr 2024" },
  { key: "{{approver_name}}", description: "Name of the approver", sample: "Tomasi Ravouvou" },
  { key: "{{rejection_reason}}", description: "Reason for rejection", sample: "Budget limit exceeded for Q2" },
  { key: "{{expense_amount}}", description: "Total expense amount", sample: "FJD 3,450.00" },
  { key: "{{policy_name}}", description: "Policy name", sample: "International Travel Policy v2" },
  { key: "{{company_name}}", description: "Organization name", sample: "Institute of Technology Toiaki" },
];

function substitutePlaceholders(text: string): string {
  let result = text;
  for (const p of PLACEHOLDERS) {
    result = result.split(p.key).join(p.sample);
  }
  return result;
}

function formatCategoryLabel(cat: string): string {
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function EmailTemplateManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return await apiRequest("POST", "/api/admin/templates", {
        ...data,
        createdBy: currentUser?.id || "system",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setIsCreateOpen(false);
      toast({ title: "Template created", description: "Email template has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create email template.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplate> }) => {
      return await apiRequest("PATCH", `/api/admin/templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setEditingTemplate(null);
      toast({ title: "Template updated", description: "Email template has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update email template.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      setDeletingTemplate(null);
      toast({ title: "Template deleted", description: "Email template has been deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete email template.", variant: "destructive" });
    },
  });

  const filteredTemplates = categoryFilter === "all"
    ? templates
    : templates.filter(t => t.category === categoryFilter);

  const handleToggleActive = (template: EmailTemplate) => {
    updateMutation.mutate({ id: template.id, data: { isActive: !template.isActive } });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredTemplates.map(t => t.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("DELETE", `/api/admin/templates/${id}`);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} templates deleted` });
  };

  const handleBulkActivate = async (isActive: boolean) => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("PATCH", `/api/admin/templates/${id}`, { isActive });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/templates"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} templates ${isActive ? "activated" : "deactivated"}` });
  };

  return (
    <div className="space-y-6">
      {/* Placeholder Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4" />
            Available Placeholders
          </CardTitle>
          <CardDescription>
            Use these placeholders in your templates. Click the preview button on any row to see a rendered example.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {PLACEHOLDERS.map((p) => (
              <div key={p.key} className="flex flex-col">
                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{p.key}</code>
                <span className="text-muted-foreground text-xs mt-1">{p.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Category:</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48" data-testid="select-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {emailCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{formatCategoryLabel(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
              <DialogDescription>
                Create a new email template with placeholders for dynamic content.
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              onSubmit={(values) => createMutation.mutate(values)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredTemplates.length > 0 && selectedIds.size === filteredTemplates.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Loading templates...</TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No email templates found.</TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(template.id)}
                      onCheckedChange={(checked) => handleSelectRow(template.id, !!checked)}
                      data-testid={`checkbox-${template.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{template.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatCategoryLabel(template.category)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.isActive ? "default" : "secondary"}
                      className="gap-1"
                      data-testid={`badge-status-${template.id}`}
                    >
                      {template.isActive ? (
                        <><CheckCircle className="w-3 h-3" /> Active</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> Inactive</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{template.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* Preview Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPreviewTemplate(template)}
                        data-testid={`button-preview-${template.id}`}
                        title="Preview template"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(template)}
                        data-testid={`button-toggle-${template.id}`}
                        disabled={updateMutation.isPending}
                      >
                        {template.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingTemplate(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Email Template</DialogTitle>
                            <DialogDescription>Update the email template details and content.</DialogDescription>
                          </DialogHeader>
                          <TemplateForm
                            defaultValues={{
                              subject: template.subject,
                              body: template.body,
                              category: template.category,
                              isActive: template.isActive,
                            }}
                            onSubmit={(values) => updateMutation.mutate({ id: template.id, data: values })}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingTemplate(template)}
                        data-testid={`button-delete-${template.id}`}
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border rounded-xl px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkActivate(true)} data-testid="button-bulk-activate">Activate</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkActivate(false)} data-testid="button-bulk-deactivate">Deactivate</Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} data-testid="button-bulk-delete">Delete</Button>
          <Button size="icon" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Template Preview
            </DialogTitle>
            <DialogDescription>
              Showing how this template will look with sample Fijian data substituted in.
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{formatCategoryLabel(previewTemplate.category)}</Badge>
                <Badge variant={previewTemplate.isActive ? "default" : "secondary"}>
                  {previewTemplate.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b">
                  <div className="text-xs text-muted-foreground mb-1">Subject</div>
                  <div className="font-medium text-sm">{substitutePlaceholders(previewTemplate.subject)}</div>
                </div>
                <div className="bg-background px-4 py-4">
                  <div className="text-xs text-muted-foreground mb-2">Body</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {substitutePlaceholders(previewTemplate.body)}
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Sample data used: Jone Ratudina, EMP-0042, TTF-2024-0142, Sydney, Australia, 15 Apr 2024
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deletingTemplate?.subject}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
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

function TemplateForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<TemplateFormValues>;
  onSubmit: (values: TemplateFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: defaultValues || {
      subject: "",
      body: "",
      category: "general",
      isActive: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Line</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Travel Approval Request for {{trip_reference}}"
                  data-testid="input-subject"
                />
              </FormControl>
              <FormDescription>
                Use placeholders like {`{{employee_name}}`} for dynamic content
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Body</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={"Dear {{employee_name}},\n\nYour travel request {{trip_reference}} requires approval..."}
                  rows={10}
                  data-testid="input-body"
                />
              </FormControl>
              <FormDescription>
                Write the email content with placeholders for personalization
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {emailCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {formatCategoryLabel(cat)}
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
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "true")} defaultValue={field.value ? "true" : "false"}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-template">
            {isPending ? "Saving..." : defaultValues ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
