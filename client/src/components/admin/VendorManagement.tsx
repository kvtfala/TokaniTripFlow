import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Vendor, InsertVendor, VendorReview } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Clock, Ban, Star, X } from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema, vendorCategorySchema } from "@shared/schema";
import { z } from "zod";

const VENDOR_CATEGORIES = ["Airlines", "Hotels", "Car Rental", "Visa Services", "Events", "Other"] as const;

const vendorFormSchema = insertVendorSchema.extend({
  name: z.string().min(1, "Vendor name is required"),
  contactEmail: z.string().email("Must be a valid email").min(1, "Contact email is required"),
  services: z.string().min(1, "Services are required"),
  category: vendorCategorySchema.default("Other"),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

type ReviewEntry = {
  rating: number;
  comment: string;
  date: string;
};

function StarRating({ value, onChange, readonly, prefix = "star" }: { value: number; onChange?: (v: number) => void; readonly?: boolean; prefix?: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
          data-testid={`${prefix}-${star}`}
        >
          <Star
            className={`w-5 h-5 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
      <span className="text-sm text-muted-foreground ml-1">{value > 0 ? `${value}/5` : "Not rated"}</span>
    </div>
  );
}

export function VendorManagement() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isFinanceAdmin = ["finance_admin", "manager", "super_admin", "travel_admin"].includes(currentUser.role);

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/admin/vendors"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const payload = { ...data, services: data.services.split(',').map(s => s.trim()) };
      return await apiRequest("POST", "/api/admin/vendors", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      setIsCreateOpen(false);
      toast({ title: "Vendor created", description: "Vendor has been added and is pending approval." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vendor> }) =>
      apiRequest("PATCH", `/api/admin/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      setEditingVendor(null);
      toast({ title: "Vendor updated", description: "Vendor has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      setDeletingVendor(null);
      toast({ title: "Vendor deleted", description: "Vendor has been removed from the system." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      category: "Other" as const,
      contactEmail: "",
      contactPhone: "",
      services: "",
      status: "pending_approval",
      proposedBy: currentUser.id,
      notes: "",
    },
  });

  const handleCreateSubmit = (values: VendorFormValues) => {
    createMutation.mutate(values);
  };

  const handleApprove = (vendor: Vendor) => {
    updateMutation.mutate({
      id: vendor.id,
      data: { status: "approved", approvedBy: currentUser.id, approvedAt: new Date() },
    });
  };

  const handleReject = (vendor: Vendor) => {
    updateMutation.mutate({
      id: vendor.id,
      data: { status: "rejected", approvedBy: currentUser.id, approvedAt: new Date(), rejectionReason: "Does not meet requirements" },
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(vendors.map(v => v.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("DELETE", `/api/admin/vendors/${id}`);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} vendors deleted` });
  };

  const handleBulkApprove = async () => {
    const pending = vendors.filter(v => selectedIds.has(v.id) && v.status === "pending_approval");
    for (const v of pending) {
      await apiRequest("PATCH", `/api/admin/vendors/${v.id}`, {
        status: "approved",
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
    setSelectedIds(new Set());
    toast({ title: `${pending.length} vendors approved` });
  };

  const handleBulkReject = async () => {
    const eligible = vendors.filter(v => selectedIds.has(v.id) && v.status === "pending_approval");
    for (const v of eligible) {
      await apiRequest("PATCH", `/api/admin/vendors/${v.id}`, {
        status: "rejected",
        approvedBy: currentUser.id,
        approvedAt: new Date(),
        rejectionReason: "Does not meet requirements",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
    setSelectedIds(new Set());
    toast({ title: `${eligible.length} vendors rejected` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case "pending_approval": return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      case "suspended": return <Badge variant="outline" className="gap-1"><Ban className="w-3 h-3" />Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading vendors...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Vendor Directory</h3>
          <p className="text-sm text-muted-foreground">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""} in system</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-vendor">
              <Plus className="w-4 h-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Create a new vendor profile. Finance approval required before vendor appears in RFQ dropdowns.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <VendorFields form={createForm} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-vendor">Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-vendor">
                    {createMutation.isPending ? "Creating..." : "Create Vendor"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={vendors.length > 0 && selectedIds.size === vendors.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No vendors found. Add your first vendor to get started.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(vendor.id)}
                      onCheckedChange={(checked) => handleSelectRow(vendor.id, !!checked)}
                      data-testid={`checkbox-${vendor.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{vendor.category || "Other"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{vendor.services.join(', ')}</TableCell>
                  <TableCell className="text-sm">
                    <div>{vendor.contactEmail}</div>
                    {vendor.contactPhone && <div className="text-muted-foreground">{vendor.contactPhone}</div>}
                  </TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell>
                    {vendor.performanceRating ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= vendor.performanceRating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        {vendor.performanceReviews && vendor.performanceReviews.length > 0 && (
                          <span className="text-xs text-muted-foreground">{vendor.performanceReviews.length} review{vendor.performanceReviews.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No rating</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {vendor.status === "pending_approval" && isFinanceAdmin && (
                        <>
                          <Button size="sm" variant="default" onClick={() => handleApprove(vendor)} disabled={updateMutation.isPending} data-testid={`button-approve-${vendor.id}`}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(vendor)} disabled={updateMutation.isPending} data-testid={`button-reject-${vendor.id}`}>
                            Reject
                          </Button>
                        </>
                      )}
                      <Dialog open={editingVendor?.id === vendor.id} onOpenChange={(open) => !open && setEditingVendor(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingVendor(vendor)}
                            data-testid={`button-edit-${vendor.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Vendor</DialogTitle>
                            <DialogDescription>Update vendor details and log a performance review.</DialogDescription>
                          </DialogHeader>
                          <VendorEditForm
                            vendor={vendor}
                            onSubmit={(data) => updateMutation.mutate({ id: vendor.id, data })}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button size="icon" variant="ghost" onClick={() => setDeletingVendor(vendor)} data-testid={`button-delete-${vendor.id}`}>
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
          {isFinanceAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkApprove} data-testid="button-bulk-approve">Approve Pending</Button>
              <Button size="sm" variant="destructive" onClick={handleBulkReject} data-testid="button-bulk-reject">Reject Pending</Button>
            </>
          )}
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} data-testid="button-bulk-delete">Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} data-testid="button-bulk-clear" className="gap-1"><X className="w-3.5 h-3.5" />Clear</Button>
        </div>
      )}

      <AlertDialog open={!!deletingVendor} onOpenChange={() => setDeletingVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingVendor?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingVendor && deleteMutation.mutate(deletingVendor.id)} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VendorFields({ form }: { form: UseFormReturn<VendorFormValues> }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Travel Services" {...field} data-testid="input-vendor-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-vendor-category-form">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VENDOR_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@acme.com" {...field} data-testid="input-vendor-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Phone</FormLabel>
              <FormControl>
                <Input placeholder="+679 123 4567" {...field} value={field.value || ""} data-testid="input-vendor-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="services"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Services Provided</FormLabel>
            <FormControl>
              <Input placeholder="Flights, Hotels, Ground Transport" {...field} data-testid="input-vendor-services" />
            </FormControl>
            <FormDescription>Comma-separated list of services</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Additional information..." {...field} value={field.value || ""} data-testid="textarea-vendor-notes" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function VendorEditForm({
  vendor,
  onSubmit,
  isPending,
}: {
  vendor: Vendor;
  onSubmit: (data: Partial<Vendor>) => void;
  isPending: boolean;
}) {
  const editSchema = z.object({
    name: z.string().min(1, "Name is required"),
    category: vendorCategorySchema,
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
    services: z.string().min(1, "Services are required"),
    notes: z.string().optional(),
  });

  type EditValues = z.infer<typeof editSchema>;

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: vendor.name,
      category: vendor.category || "Other",
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone || "",
      services: vendor.services.join(', '),
      notes: vendor.notes || "",
    },
  });

  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDate, setReviewDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleSubmit = (values: EditValues) => {
    const payload: Partial<Vendor> = {
      ...values,
      services: values.services.split(',').map(s => s.trim()),
    };

    if (reviewRating > 0) {
      const newReview: VendorReview = {
        rating: reviewRating,
        comment: reviewComment,
        date: reviewDate,
      };
      const existingReviews: VendorReview[] = vendor.performanceReviews ?? [];
      const allReviews = [...existingReviews, newReview];
      const avgRating = Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10;
      payload.performanceReviews = allReviews;
      payload.performanceRating = avgRating;
    }

    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-edit-vendor-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-vendor-category">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} data-testid="input-edit-vendor-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} data-testid="input-edit-vendor-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services Provided</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-edit-vendor-services" />
              </FormControl>
              <FormDescription>Comma-separated list of services</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} data-testid="textarea-edit-vendor-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Performance Review Section */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Log Performance Review</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record a new rating for this vendor. The stored rating will be averaged with any existing score.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            {vendor.performanceRating && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Current rating:</span>
                <StarRating value={vendor.performanceRating} readonly prefix="current-star" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Review Date</label>
                <Input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  data-testid="input-review-date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Comment (optional)</label>
                <Input
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Brief review notes..."
                  data-testid="input-review-comment"
                />
              </div>
            </div>

            {reviewRating > 0 && (() => {
              const existingReviews = vendor.performanceReviews ?? [];
              const allReviews = [...existingReviews, { rating: reviewRating, comment: reviewComment, date: reviewDate }];
              const newAvg = Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10;
              return (
                <p className="text-xs text-muted-foreground">
                  New performance rating will be set to{" "}
                  <strong>{newAvg}/5</strong>{" "}
                  (average of {allReviews.length} review{allReviews.length !== 1 ? "s" : ""})
                </p>
              );
            })()}
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-edit-vendor">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
