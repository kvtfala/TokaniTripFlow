import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import type { CostCentreRecord } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Pencil, Trash2, Building2, LayoutGrid } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const TIMEZONES = [
  "Pacific/Fiji",
  "Pacific/Auckland",
  "Pacific/Port_Moresby",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Asia/Tokyo",
  "UTC",
] as const;

interface CompanyProfileData {
  companyCode: string;
  displayName: string;
  contactEmail: string | null;
  timezone: string | null;
  logoUrl: string | null;
}

function CompanyProfileSection() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<CompanyProfileData>({
    queryKey: ["/api/admin/settings"],
  });

  const [form, setForm] = useState<Partial<CompanyProfileData>>({});
  const isDirty = Object.keys(form).length > 0;

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<CompanyProfileData>) =>
      apiRequest("PATCH", "/api/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setForm({});
      toast({ title: "Settings saved", description: "Company profile updated successfully." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const current = { ...settings, ...form };

  const handleChange = (field: keyof CompanyProfileData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading company profile…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-company-profile">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Organisation Name</Label>
          <Input
            id="displayName"
            value={current.displayName ?? ""}
            onChange={e => handleChange("displayName", e.target.value)}
            placeholder="Island Travel Technologies"
            data-testid="input-display-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={current.contactEmail ?? ""}
            onChange={e => handleChange("contactEmail", e.target.value)}
            placeholder="admin@company.com"
            data-testid="input-contact-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={current.timezone ?? "Pacific/Fiji"}
            onValueChange={val => handleChange("timezone", val)}
          >
            <SelectTrigger data-testid="select-timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input
            id="logoUrl"
            value={current.logoUrl ?? ""}
            onChange={e => handleChange("logoUrl", e.target.value)}
            placeholder="https://cdn.company.com/logo.png"
            data-testid="input-logo-url"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isDirty || saveMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}

function CostCentresSection() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CostCentreRecord | null>(null);
  const [deletingCC, setDeletingCC] = useState<CostCentreRecord | null>(null);
  const [ccForm, setCcForm] = useState({ code: "", name: "", budgetLimit: "" });

  const { data: centres = [], isLoading } = useQuery<CostCentreRecord[]>({
    queryKey: ["/api/admin/cost-centres"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof ccForm) =>
      apiRequest("POST", "/api/admin/cost-centres", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-centres"] });
      setIsCreateOpen(false);
      setCcForm({ code: "", name: "", budgetLimit: "" });
      toast({ title: "Cost centre added", description: "New cost centre created successfully." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CostCentreRecord> }) =>
      apiRequest("PATCH", `/api/admin/cost-centres/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-centres"] });
      setEditingCC(null);
      setCcForm({ code: "", name: "", budgetLimit: "" });
      toast({ title: "Cost centre updated", description: "Changes saved." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/admin/cost-centres/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-centres"] });
      setDeletingCC(null);
      toast({ title: "Cost centre deleted", description: "Removed successfully." });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setCcForm({ code: "", name: "", budgetLimit: "" });
    setIsCreateOpen(true);
  };

  const openEdit = (cc: CostCentreRecord) => {
    setCcForm({
      code: cc.code,
      name: cc.name,
      budgetLimit: cc.budgetLimit ? String(cc.budgetLimit) : "",
    });
    setEditingCC(cc);
  };

  const handleFormSubmit = () => {
    if (editingCC) {
      updateMutation.mutate({ id: editingCC.id, data: ccForm });
    } else {
      createMutation.mutate(ccForm);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" data-testid="cost-centres-section">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {centres.length} cost centre{centres.length !== 1 ? "s" : ""} configured
        </p>
        <Button size="sm" className="gap-2" onClick={openCreate} data-testid="button-add-cost-centre">
          <Plus className="w-4 h-4" />
          Add Cost Centre
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Budget Limit (FJD)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : centres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No cost centres configured. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              centres.map(cc => (
                <TableRow key={cc.id} data-testid={`row-cc-${cc.id}`}>
                  <TableCell className="font-mono font-medium">{cc.code}</TableCell>
                  <TableCell>{cc.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cc.budgetLimit
                      ? Number(cc.budgetLimit).toLocaleString("en-FJ", { minimumFractionDigits: 2 })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(cc)}
                        data-testid={`button-edit-cc-${cc.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingCC(cc)}
                        data-testid={`button-delete-cc-${cc.id}`}
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

      <Dialog
        open={isCreateOpen || !!editingCC}
        onOpenChange={open => { if (!open) { setIsCreateOpen(false); setEditingCC(null); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCC ? "Edit Cost Centre" : "Add Cost Centre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cc-code">Code</Label>
              <Input
                id="cc-code"
                value={ccForm.code}
                onChange={e => setCcForm(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. 100-BOD"
                data-testid="input-cc-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-name">Name</Label>
              <Input
                id="cc-name"
                value={ccForm.name}
                onChange={e => setCcForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Board of Directors"
                data-testid="input-cc-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-budget">Annual Budget Limit (FJD, optional)</Label>
              <Input
                id="cc-budget"
                type="number"
                value={ccForm.budgetLimit}
                onChange={e => setCcForm(p => ({ ...p, budgetLimit: e.target.value }))}
                placeholder="e.g. 150000"
                data-testid="input-cc-budget"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsCreateOpen(false); setEditingCC(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={!ccForm.code || !ccForm.name || isMutating}
              data-testid="button-save-cc"
            >
              {isMutating ? "Saving…" : editingCC ? "Save Changes" : "Add Cost Centre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCC} onOpenChange={() => setDeletingCC(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Centre</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingCC?.code} — {deletingCC?.name}</strong>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-cc">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCC && deleteMutation.mutate(deletingCC.id)}
              data-testid="button-confirm-delete-cc"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminSettings() {
  return (
    <div className="space-y-8" data-testid="admin-settings">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Company Profile</h3>
        </div>
        <CompanyProfileSection />
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Cost Centres</h3>
          <span className="text-sm text-muted-foreground">— Budget codes used across the system</span>
        </div>
        <CostCentresSection />
      </div>
    </div>
  );
}
