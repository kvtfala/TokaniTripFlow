import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, InsertVendor } from "@shared/schema";
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
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { useForm } from "react-hook-form";
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

export function VendorManagement() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

  const isFinanceAdmin = currentUser.role === "finance_admin" || currentUser.role === "manager";

  // Fetch vendors
  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/admin/vendors"],
  });

  // Create vendor mutation
  const createMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      // Convert services string to array
      const payload = {
        ...data,
        services: data.services.split(',').map(s => s.trim()),
      };
      return await apiRequest("POST", "/api/admin/vendors", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      setIsCreateOpen(false);
      toast({
        title: "Vendor created",
        description: "Vendor has been added successfully and is pending approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vendor> }) => {
      return await apiRequest("PATCH", `/api/admin/vendors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      setEditingVendor(null);
      toast({
        title: "Vendor updated",
        description: "Vendor has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      setDeletingVendor(null);
      toast({
        title: "Vendor deleted",
        description: "Vendor has been removed from the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<VendorFormValues>({
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

  const handleEditSubmit = (values: VendorFormValues) => {
    if (editingVendor) {
      // Convert services string to array
      const payload = {
        ...values,
        services: values.services.split(',').map(s => s.trim()),
      };
      updateMutation.mutate({ id: editingVendor.id, data: payload });
    }
  };

  const handleApprove = (vendor: Vendor) => {
    updateMutation.mutate({
      id: vendor.id,
      data: {
        status: "approved",
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      },
    });
  };

  const handleReject = (vendor: Vendor, reason: string) => {
    updateMutation.mutate({
      id: vendor.id,
      data: {
        status: "rejected",
        approvedBy: currentUser.id,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="gap-1" data-testid={`status-approved`}>
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge variant="secondary" className="gap-1" data-testid={`status-pending`}>
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1" data-testid={`status-rejected`}>
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="gap-1" data-testid={`status-suspended`}>
            <Ban className="w-3 h-3" />
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading vendors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vendor Directory</h3>
          <p className="text-sm text-muted-foreground">
            {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} in system
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-vendor">
              <Plus className="w-4 h-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Create a new vendor profile. Finance approval required before vendor appears in RFQ dropdowns.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
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
                            {VENDOR_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
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
                      <FormDescription>
                        Comma-separated list of services
                      </FormDescription>
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-vendor">
                    Cancel
                  </Button>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No vendors found. Add your first vendor to get started.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{vendor.category || "Other"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{vendor.services.join(', ')}</TableCell>
                  <TableCell className="text-sm">
                    <div>{vendor.contactEmail}</div>
                    {vendor.contactPhone && (
                      <div className="text-muted-foreground">{vendor.contactPhone}</div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell>
                    {vendor.performanceRating ? (
                      <span className="text-sm">{vendor.performanceRating}/5</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {vendor.status === "pending_approval" && isFinanceAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(vendor)}
                            disabled={updateMutation.isPending}
                            data-testid={`button-approve-${vendor.id}`}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(vendor, "Vendor does not meet requirements")}
                            disabled={updateMutation.isPending}
                            data-testid={`button-reject-${vendor.id}`}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingVendor(vendor)}
                        data-testid={`button-delete-${vendor.id}`}
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
            <AlertDialogAction
              onClick={() => deletingVendor && deleteMutation.mutate(deletingVendor.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
