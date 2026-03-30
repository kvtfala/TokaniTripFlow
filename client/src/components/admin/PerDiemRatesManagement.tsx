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
import { Plus, Pencil, Trash2, Calendar, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type PerDiemRate = {
  id: string;
  location: string;
  dailyRate: string;
  currency: string;
  tier: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdBy: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const currencies = ["FJD", "USD", "AUD", "NZD", "EUR", "GBP"];
const tiers = ["standard", "manager", "executive"];

const rateSchema = z.object({
  location: z.string().min(1, "Location is required").max(255),
  dailyRate: z.string().min(1, "Daily rate is required"),
  currency: z.enum(currencies as [string, ...string[]]),
  tier: z.enum(tiers as [string, ...string[]]),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  effectiveTo: z.string().optional(),
  notes: z.string().optional(),
});

type RateFormValues = z.infer<typeof rateSchema>;

export function PerDiemRatesManagement() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<PerDiemRate | null>(null);
  const [deletingRate, setDeletingRate] = useState<PerDiemRate | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch per diem rates
  const { data: rates = [], isLoading } = useQuery<PerDiemRate[]>({
    queryKey: ["/api/admin/rates"],
  });

  // Create rate mutation
  const createMutation = useMutation({
    mutationFn: async (data: RateFormValues) => {
      const payload = {
        ...data,
        createdBy: currentUser?.id || "system",
      };
      return await apiRequest("POST", "/api/admin/rates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      setIsCreateOpen(false);
      toast({
        title: "Rate created",
        description: "Per diem rate has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create per diem rate.",
        variant: "destructive",
      });
    },
  });

  // Update rate mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PerDiemRate> }) => {
      return await apiRequest("PATCH", `/api/admin/rates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      setEditingRate(null);
      toast({
        title: "Rate updated",
        description: "Per diem rate has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update per diem rate.",
        variant: "destructive",
      });
    },
  });

  // Delete rate mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      setDeletingRate(null);
      toast({
        title: "Rate deleted",
        description: "Per diem rate has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete per diem rate.",
        variant: "destructive",
      });
    },
  });

  // Filter rates
  const filteredRates = tierFilter === "all"
    ? rates
    : rates.filter(r => r.tier === tierFilter);

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredRates.map(r => r.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await apiRequest("DELETE", `/api/admin/rates/${id}`);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} rates deleted` });
  };

  // Check if rate is currently active
  const isActiveRate = (rate: PerDiemRate) => {
    const now = new Date();
    const from = new Date(rate.effectiveFrom);
    const to = rate.effectiveTo ? new Date(rate.effectiveTo) : null;
    return from <= now && (!to || to >= now);
  };

  return (
    <div className="space-y-6">
      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tier:</span>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-40" data-testid="select-tier-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {tiers.map(tier => (
                <SelectItem key={tier} value={tier}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-rate">
              <Plus className="w-4 h-4 mr-2" />
              Create Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Per Diem Rate</DialogTitle>
              <DialogDescription>
                Configure location-based daily allowance with effective date range.
              </DialogDescription>
            </DialogHeader>
            <RateForm
              onSubmit={(values) => createMutation.mutate(values)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Rates Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredRates.length > 0 && selectedIds.size === filteredRates.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Daily Rate</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Effective Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading rates...
                </TableCell>
              </TableRow>
            ) : filteredRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No per diem rates found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRates.map((rate) => (
                <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(rate.id)}
                      onCheckedChange={(checked) => handleSelectRow(rate.id, !!checked)}
                      data-testid={`checkbox-${rate.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{rate.location}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-mono">{rate.currency} {parseFloat(rate.dailyRate).toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {rate.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(rate.effectiveFrom), "dd MMM yyyy")}
                        {rate.effectiveTo && (
                          <> - {format(new Date(rate.effectiveTo), "dd MMM yyyy")}</>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isActiveRate(rate) ? "default" : "secondary"}
                      data-testid={`badge-status-${rate.id}`}
                    >
                      {isActiveRate(rate) ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog open={editingRate?.id === rate.id} onOpenChange={(open) => !open && setEditingRate(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRate(rate)}
                            data-testid={`button-edit-${rate.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Per Diem Rate</DialogTitle>
                            <DialogDescription>
                              Update the per diem rate configuration.
                            </DialogDescription>
                          </DialogHeader>
                          <RateForm
                            defaultValues={{
                              location: rate.location,
                              dailyRate: rate.dailyRate,
                              currency: rate.currency,
                              tier: rate.tier,
                              effectiveFrom: format(new Date(rate.effectiveFrom), "yyyy-MM-dd"),
                              effectiveTo: rate.effectiveTo ? format(new Date(rate.effectiveTo), "yyyy-MM-dd") : "",
                              notes: rate.notes || "",
                            }}
                            onSubmit={(values) => updateMutation.mutate({ id: rate.id, data: values as any })}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingRate(rate)}
                        data-testid={`button-delete-${rate.id}`}
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
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} data-testid="button-bulk-delete">Delete</Button>
          <Button size="icon" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRate} onOpenChange={() => setDeletingRate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Per Diem Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rate for "{deletingRate?.location}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRate && deleteMutation.mutate(deletingRate.id)}
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

function RateForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<RateFormValues>;
  onSubmit: (values: RateFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: defaultValues || {
      location: "",
      dailyRate: "",
      currency: "FJD",
      tier: "standard",
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      effectiveTo: "",
      notes: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Sydney, Australia"
                    data-testid="input-location"
                  />
                </FormControl>
                <FormDescription>
                  City or country where this rate applies
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dailyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Rate</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="150.00"
                    data-testid="input-daily-rate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencies.map(curr => (
                      <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-tier">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tiers.map(tier => (
                      <SelectItem key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
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
                <FormDescription>
                  Start date for this rate
                </FormDescription>
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
                <FormDescription>
                  End date (leave blank for indefinite)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Additional information about this rate..."
                  rows={3}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending ? "Saving..." : "Save Rate"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
