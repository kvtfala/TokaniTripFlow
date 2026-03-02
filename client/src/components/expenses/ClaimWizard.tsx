import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ReceiptUploader } from "./ReceiptUploader";
import type { ExtractedReceiptData } from "./ReceiptUploader";
import type { TravelRequest, ExpenseClaim, ExpenseCategory } from "@shared/types";
import { apiRequest } from "@/lib/queryClient";
import { nanoid } from "nanoid";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: ExpenseCategory[] = [
  "Meals",
  "Accommodation",
  "Transport (Local)",
  "Flights",
  "Visa / Entry Fees",
  "Communication",
  "Other",
];

interface LineItemForm {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: string;
  merchantName: string;
  receiptDate: string;
  notes: string;
  receiptUrl: string;
  previewUrl: string;
  ocrConfidence: "high" | "medium" | "low" | "";
}

interface ClaimWizardProps {
  open: boolean;
  onClose: () => void;
  preselectedRequestId?: string;
}

function defaultLineItem(): LineItemForm {
  return {
    id: nanoid(8),
    description: "",
    category: "Other",
    amount: "",
    merchantName: "",
    receiptDate: "",
    notes: "",
    receiptUrl: "",
    previewUrl: "",
    ocrConfidence: "",
  };
}

export function ClaimWizard({ open, onClose, preselectedRequestId }: ClaimWizardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(preselectedRequestId || "");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([defaultLineItem()]);
  const [submitting, setSubmitting] = useState(false);

  const { data: trips = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const eligibleTrips = trips.filter(t =>
    ["approved", "completed", "quotes_submitted"].includes(t.status)
  );
  const selectedTrip = eligibleTrips.find(t => t.id === selectedRequestId);

  function handleOcrExtracted(index: number, data: ExtractedReceiptData, previewUrl: string) {
    setLineItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              merchantName: data.merchantName || item.merchantName,
              receiptDate: data.receiptDate || item.receiptDate,
              amount: data.totalAmount !== null ? String(data.totalAmount) : item.amount,
              category: data.category || item.category,
              description: data.merchantName
                ? `${data.category} - ${data.merchantName}`
                : item.description,
              previewUrl,
              ocrConfidence: data.confidence,
            }
          : item
      )
    );
  }

  function handleClearReceipt(index: number) {
    setLineItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, previewUrl: "", receiptUrl: "", ocrConfidence: "" } : item
      )
    );
  }

  function updateLineItem(index: number, field: keyof LineItemForm, value: string) {
    setLineItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems(prev => [...prev, defaultLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  async function handleSubmit() {
    if (!selectedRequestId || lineItems.length === 0) return;
    setSubmitting(true);
    try {
      const createRes = await apiRequest("POST", `/api/requests/${selectedRequestId}/expense-claims`, {});
      const claim: ExpenseClaim = await createRes.json();

      const formattedItems = lineItems
        .filter(item => item.description || item.amount)
        .map(item => ({
          id: item.id,
          description: item.description || item.merchantName || "Expense",
          category: item.category,
          amount: parseFloat(item.amount) || 0,
          merchantName: item.merchantName || undefined,
          receiptDate: item.receiptDate || undefined,
          receiptUrl: item.receiptUrl || undefined,
          ocrConfidence: (item.ocrConfidence as "high" | "medium" | "low") || undefined,
          notes: item.notes || undefined,
        }));

      await apiRequest("PATCH", `/api/expense-claims/${claim.id}`, {
        lineItems: formattedItems,
      });

      await apiRequest("POST", `/api/expense-claims/${claim.id}/submit`, {});

      qc.invalidateQueries({ queryKey: ["/api/expense-claims"] });
      qc.invalidateQueries({ queryKey: ["/api/requests", selectedRequestId, "expense-claims"] });

      toast({ title: "Expense claim submitted", description: `FJD ${total.toFixed(2)} submitted for review.` });
      handleClose();
    } catch (err: any) {
      toast({ title: "Submission failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setSelectedRequestId(preselectedRequestId || "");
    setLineItems([defaultLineItem()]);
    onClose();
  }

  const canProceedStep0 = !!selectedRequestId;
  const canProceedStep1 = lineItems.some(i => i.description && i.amount && parseFloat(i.amount) > 0);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-claim-wizard">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            New Expense Claim
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {["Select Trip", "Add Receipts", "Review & Submit"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-sm ${i === step ? "text-primary font-medium" : i < step ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <CheckCircle className="w-3 h-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 0: Select Trip */}
        {step === 0 && (
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Which trip is this claim for?</Label>
              {eligibleTrips.length === 0 ? (
                <div className="rounded-md border border-border p-6 text-center text-muted-foreground text-sm">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No approved trips found. Expense claims can only be linked to approved or completed trips.
                </div>
              ) : (
                <div className="space-y-2" data-testid="trip-selector">
                  {eligibleTrips.map(trip => (
                    <button
                      key={trip.id}
                      type="button"
                      data-testid={`trip-option-${trip.id}`}
                      onClick={() => setSelectedRequestId(trip.id)}
                      className={`w-full text-left rounded-md border p-3 transition-colors ${
                        selectedRequestId === trip.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-medium text-sm">{trip.reference}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeof trip.destination === "object" && trip.destination !== null
                              ? `${(trip.destination as any).city}, ${(trip.destination as any).country}`
                              : String(trip.destination || "")} — {trip.departureDate ? new Date(trip.departureDate).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">{trip.status.replace("_", " ")}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Add line items with receipt upload */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Upload receipt photos — AI will pre-fill the details for each expense.
            </p>
            {lineItems.map((item, index) => (
              <div key={item.id} className="rounded-md border border-border p-4 space-y-3" data-testid={`line-item-${index}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  {lineItems.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLineItem(index)}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <ReceiptUploader
                  compact
                  previewUrl={item.previewUrl}
                  onExtracted={(data, previewUrl) => handleOcrExtracted(index, data, previewUrl)}
                  onClear={() => handleClearReceipt(index)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Description</Label>
                    <Input
                      placeholder="e.g. Lunch with client"
                      value={item.description}
                      onChange={e => updateLineItem(index, "description", e.target.value)}
                      data-testid={`input-description-${index}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Category</Label>
                    <Select
                      value={item.category}
                      onValueChange={v => updateLineItem(index, "category", v)}
                    >
                      <SelectTrigger data-testid={`select-category-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Amount (FJD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={e => updateLineItem(index, "amount", e.target.value)}
                      data-testid={`input-amount-${index}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Merchant / Vendor</Label>
                    <Input
                      placeholder="e.g. Air Pacific"
                      value={item.merchantName}
                      onChange={e => updateLineItem(index, "merchantName", e.target.value)}
                      data-testid={`input-merchant-${index}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Receipt Date</Label>
                    <Input
                      type="date"
                      value={item.receiptDate}
                      onChange={e => updateLineItem(index, "receiptDate", e.target.value)}
                      data-testid={`input-receipt-date-${index}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Notes (optional)</Label>
                    <Input
                      placeholder="Any additional notes"
                      value={item.notes}
                      onChange={e => updateLineItem(index, "notes", e.target.value)}
                      data-testid={`input-notes-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={addLineItem}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Expense
            </Button>
          </div>
        )}

        {/* Step 2: Summary */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="rounded-md border border-border p-4 space-y-2" data-testid="claim-summary">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trip</span>
                <span className="font-medium">{selectedTrip?.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destination</span>
                <span>
                  {selectedTrip?.destination && typeof selectedTrip.destination === "object"
                    ? `${(selectedTrip.destination as any).city}, ${(selectedTrip.destination as any).country}`
                    : String(selectedTrip?.destination || "")}
                </span>
              </div>
              <Separator />
              {lineItems.filter(i => i.description || i.amount).map((item, i) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.description || item.merchantName || `Item ${i + 1}`}</span>
                  <span>FJD {parseFloat(item.amount || "0").toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Claimed</span>
                <span className="text-primary">FJD {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
              By submitting, you confirm that all expenses are legitimate business expenses incurred during the approved trip.
            </div>
          </div>
        )}

        <Separator />

        <div className="flex justify-between gap-3 pt-2">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} data-testid="button-prev-step">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose} data-testid="button-cancel-wizard">Cancel</Button>
          )}

          {step < 2 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
              data-testid="button-next-step"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="button-submit-claim"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Submit Claim
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
