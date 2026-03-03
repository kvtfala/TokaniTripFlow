import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Plane,
  FileText,
  Send,
  Plus,
  Mail,
  Trash2,
  Star,
  Link as LinkIcon,
  Upload,
  Copy,
  ExternalLink,
  Receipt
} from "lucide-react";
import type { Vendor } from "@shared/schema";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelRequest, RequestStatus, TravelQuote, QuotePolicy, ExpenseClaim } from "@shared/types";
import { ClaimWizard } from "@/components/expenses/ClaimWizard";

// RFQ Section Component — pulls approved vendors from the directory
function RfqSection({ requestId, request }: { requestId: string; request: TravelRequest }) {
  const { toast } = useToast();
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualVendors, setManualVendors] = useState<Array<{ vendorName: string; email: string }>>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: approvedVendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors/approved"],
  });

  const categories = ["Airlines", "Hotels", "Car Rental", "Visa Services", "Events", "Other"];
  const filteredVendors = categoryFilter === "all"
    ? approvedVendors
    : approvedVendors.filter(v => v.category === categoryFilter);

  const toggleVendor = (vendor: Vendor) => {
    setSelectedVendorIds(prev => {
      const next = new Set(prev);
      if (next.has(vendor.id)) next.delete(vendor.id);
      else next.add(vendor.id);
      return next;
    });
  };

  const addManualVendor = () => {
    if (!manualName.trim() || !manualEmail.trim()) {
      toast({ title: "Missing Information", description: "Enter both vendor name and email", variant: "destructive" });
      return;
    }
    if (manualVendors.some(v => v.email.toLowerCase() === manualEmail.toLowerCase())) {
      toast({ title: "Duplicate Email", description: "This vendor is already in the list", variant: "destructive" });
      return;
    }
    setManualVendors([...manualVendors, { vendorName: manualName.trim(), email: manualEmail.trim() }]);
    setManualName(""); setManualEmail("");
  };

  const sendRfqMutation = useMutation({
    mutationFn: async () => {
      const fromDirectory = approvedVendors
        .filter(v => selectedVendorIds.has(v.id))
        .map(v => ({ vendorName: v.name, email: v.contactEmail }));
      const allVendors = [...fromDirectory, ...manualVendors];
      return apiRequest("POST", `/api/requests/${requestId}/send-rfq`, { vendors: allVendors });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      setSelectedVendorIds(new Set());
      setManualVendors([]);
      toast({ title: "RFQ Sent Successfully", description: "Vendors have been notified to submit quotes" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send RFQ. Please try again.", variant: "destructive" });
    },
  });

  const totalSelected = selectedVendorIds.size + manualVendors.length;

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send RFQ to Vendors
        </CardTitle>
        <CardDescription>
          Select from approved vendors or add vendors manually to request quotes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.rfqRecipients && request.rfqRecipients.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Previously Sent To:</p>
            <div className="space-y-1">
              {request.rfqRecipients.map((r, idx) => (
                <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  {r.vendorName} ({r.email}) — {format(new Date(r.sentAt), "MMM dd, yyyy")}
                </div>
              ))}
            </div>
            <Separator className="my-3" />
          </div>
        )}

        {/* Approved Vendor Directory */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-sm font-semibold">Approved Vendor Directory</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40" data-testid="select-vendor-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filteredVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No approved vendors in this category.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredVendors.map(vendor => (
                <div
                  key={vendor.id}
                  onClick={() => toggleVendor(vendor)}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedVendorIds.has(vendor.id) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid={`vendor-select-${vendor.id}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedVendorIds.has(vendor.id)}
                    readOnly
                    className="pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{vendor.name}</p>
                      <Badge variant="outline" className="text-xs">{vendor.category}</Badge>
                      {vendor.performanceRating && (
                        <Badge variant="outline" className="text-xs">
                          <Star className="w-2.5 h-2.5 mr-1" />{vendor.performanceRating}/5
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{vendor.contactEmail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Manual Vendor Entry */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Add Vendor Manually</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vendor-name" className="text-xs text-muted-foreground">Vendor Name</Label>
              <Input
                id="vendor-name"
                placeholder="e.g., Pacific Travel Services"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                data-testid="input-vendor-name"
              />
            </div>
            <div>
              <Label htmlFor="vendor-email" className="text-xs text-muted-foreground">Vendor Email</Label>
              <div className="flex gap-2">
                <Input
                  id="vendor-email"
                  type="email"
                  placeholder="vendor@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addManualVendor()}
                  data-testid="input-vendor-email"
                />
                <Button type="button" onClick={addManualVendor} variant="outline" size="icon" data-testid="button-add-vendor">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          {manualVendors.length > 0 && (
            <div className="space-y-1">
              {manualVendors.map((v) => (
                <div key={v.email} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div>
                    <p className="text-sm font-medium">{v.vendorName}</p>
                    <p className="text-xs text-muted-foreground">{v.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setManualVendors(manualVendors.filter(m => m.email !== v.email))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={() => sendRfqMutation.mutate()}
          disabled={totalSelected === 0 || sendRfqMutation.isPending}
          data-testid="button-send-rfq"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendRfqMutation.isPending ? "Sending..." : `Send RFQ to ${totalSelected} Vendor${totalSelected !== 1 ? "s" : ""}`}
        </Button>
      </CardContent>
    </Card>
  );
}

// Quotes Section Component
function QuotesSection({ 
  requestId, 
  request, 
  quotes, 
  quotesLoading, 
  quotePolicy 
}: { 
  requestId: string; 
  request: TravelRequest; 
  quotes: TravelQuote[]; 
  quotesLoading: boolean;
  quotePolicy?: QuotePolicy;
}) {
  const { toast} = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(request.selectedQuoteId);
  const [quoteJustification, setQuoteJustification] = useState(request.quoteJustification || "");
  
  useEffect(() => {
    // Only sync from server when server has a meaningful value — avoids resetting user's
    // local radio selection back to undefined while they are still working on the form
    if (request.selectedQuoteId) setSelectedQuoteId(request.selectedQuoteId);
    if (request.quoteJustification) setQuoteJustification(request.quoteJustification);
  }, [request.selectedQuoteId, request.quoteJustification]);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfObjectPath, setPdfObjectPath] = useState<string>("");
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => setPdfObjectPath(response.objectPath),
  });

  const [newQuote, setNewQuote] = useState({
    vendorName: "",
    quoteValue: "",
    currency: "FJD",
    quoteExpiry: "",
    notes: "",
  });

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!pdfObjectPath) throw new Error("PDF attachment is required");
      return apiRequest("POST", `/api/requests/${requestId}/quotes`, {
        vendorName: newQuote.vendorName.trim(),
        quoteValue: parseFloat(newQuote.quoteValue),
        currency: newQuote.currency,
        quoteExpiry: newQuote.quoteExpiry,
        notes: newQuote.notes.trim() || undefined,
        attachmentUrl: pdfObjectPath,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      setDialogOpen(false);
      setNewQuote({ vendorName: "", quoteValue: "", currency: "FJD", quoteExpiry: "", notes: "" });
      setPdfFile(null);
      setPdfObjectPath("");
      toast({ title: "Quote Added", description: "Vendor quote has been added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add quote. Please try again.", variant: "destructive" });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("DELETE", `/api/requests/${requestId}/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "quotes"] });
      toast({
        title: "Quote Deleted",
        description: "Vendor quote has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quote",
        variant: "destructive",
      });
    },
  });

  const submitWithQuotesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuoteId) {
        throw new Error("Please select a quote");
      }
      
      // Client-side validation for quote policy (with null guards)
      const isInternational = request.destination.country !== "Fiji";
      const minRequired = isInternational ? (quotePolicy?.minQuotesInternational || 3) : (quotePolicy?.minQuotesDomestic || 2);
      
      if (quotes.length < minRequired) {
        throw new Error(`Policy requires ${minRequired} quotes. You have ${quotes.length}.`);
      }
      
      // Check if justification is required (not selecting cheapest)
      const cheapest = quotes.length > 0 ? quotes.reduce((min, q) => q.quoteValue < min.quoteValue ? q : min) : null;
      const needsJustification = cheapest && selectedQuoteId !== cheapest.id;
      
      if (needsJustification && !quoteJustification.trim()) {
        throw new Error("Justification required when not selecting the cheapest quote");
      }
      
      return apiRequest("POST", `/api/requests/${requestId}/submit-with-quotes`, {
        selectedQuoteId,
        quoteJustification: quoteJustification.trim() || undefined,
      });
    },
    onSuccess: () => {
      // Refetch both request and quotes to sync state
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "quotes"] });
      toast({
        title: "Success!",
        description: "Request submitted with quotes for final approval",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request with quotes",
        variant: "destructive",
      });
    },
  });

  const isInternational = request.destination.country !== "Fiji";
  const budgetExceeds1000 = (request.totalEstimatedBudget ?? 0) > 1000;
  // Policy: 3 quotes required if budget > FJD 1,000 OR international trip
  const minQuotes = (budgetExceeds1000 || isInternational)
    ? Math.max(3, quotePolicy?.minQuotesInternational || 3)
    : (quotePolicy?.minQuotesDomestic || 2);
  const cheapestQuote = quotes.length > 0 ? quotes.reduce((min, q) => q.quoteValue < min.quoteValue ? q : min) : null;
  const requiresJustification = selectedQuoteId && cheapestQuote && selectedQuoteId !== cheapestQuote.id;
  const quotesDeficit = Math.max(0, minQuotes - quotes.length);
  const canSubmit = quotes.length >= minQuotes && !!selectedQuoteId && (!requiresJustification || quoteJustification.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Vendor Quotes
        </CardTitle>
        <CardDescription>
          {isInternational ? "International" : "Domestic"} trip
          {budgetExceeds1000 && " · Budget exceeds FJD 1,000"}
          {" "}— Minimum {minQuotes} quotes required per policy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No quotes added yet. Click "Add Quote" to log vendor quotes.
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div 
                key={quote.id} 
                className={`p-3 rounded-md border ${
                  selectedQuoteId === quote.id ? "border-primary bg-primary/5" : "border-border"
                } ${quote.id === cheapestQuote?.id ? "ring-2 ring-green-500/20" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {request.status === "awaiting_quotes" && (
                      <input
                        type="radio"
                        name="selectedQuote"
                        checked={selectedQuoteId === quote.id}
                        onChange={() => setSelectedQuoteId(quote.id)}
                        className="mt-1"
                        data-testid={`radio-select-quote-${quote.id}`}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{quote.vendorName}</p>
                        {quote.id === cheapestQuote?.id && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Cheapest
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quote.currency} {quote.quoteValue.toFixed(2)} · Valid until {quote.quoteExpiry ? format(new Date(quote.quoteExpiry), "MMM dd, yyyy") : "N/A"}
                      </p>
                      {quote.attachmentUrl && (
                        <a
                          href={quote.attachmentUrl.startsWith("/objects/") ? quote.attachmentUrl : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                          data-testid={`link-quote-pdf-${quote.id}`}
                        >
                          <FileText className="w-3 h-3" />
                          View PDF
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {quote.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{quote.notes}</p>
                      )}
                    </div>
                  </div>
                  {request.status === "awaiting_quotes" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuoteMutation.mutate(quote.id)}
                      disabled={selectedQuoteId === quote.id}
                      data-testid={`button-delete-quote-${quote.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {request.status === "awaiting_quotes" && (
          <>
            {/* Policy compliance gate */}
            {budgetExceeds1000 && quotesDeficit > 0 && (
              <Alert variant="destructive" data-testid="alert-quote-policy">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>3 Quotes Required per Policy</strong> — This request has a budget exceeding FJD 1,000.
                  You have {quotes.length} of {minQuotes} required quotes.
                  Add {quotesDeficit} more quote{quotesDeficit !== 1 ? "s" : ""} before submitting for approval.
                </AlertDescription>
              </Alert>
            )}

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setNewQuote({ vendorName: "", quoteValue: "", currency: "FJD", quoteExpiry: "", notes: "" });
                setPdfFile(null);
                setPdfObjectPath("");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline" data-testid="button-open-add-quote">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Quote
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Vendor Quote</DialogTitle>
                  <DialogDescription>
                    Log a quote received from a travel vendor
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quote-vendor">Vendor Name *</Label>
                    <Input
                      id="quote-vendor"
                      value={newQuote.vendorName}
                      onChange={(e) => setNewQuote({ ...newQuote, vendorName: e.target.value })}
                      placeholder="e.g., Fiji Airways"
                      data-testid="input-quote-vendor"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="quote-value">Quote Amount *</Label>
                      <Input
                        id="quote-value"
                        type="number"
                        step="0.01"
                        value={newQuote.quoteValue}
                        onChange={(e) => setNewQuote({ ...newQuote, quoteValue: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-quote-value"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quote-currency">Currency *</Label>
                      <Select
                        value={newQuote.currency}
                        onValueChange={(value) => setNewQuote({ ...newQuote, currency: value })}
                      >
                        <SelectTrigger id="quote-currency" data-testid="select-quote-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FJD">FJD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="NZD">NZD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="quote-expiry">Quote Expiry *</Label>
                    <Input
                      id="quote-expiry"
                      type="date"
                      value={newQuote.quoteExpiry}
                      onChange={(e) => setNewQuote({ ...newQuote, quoteExpiry: e.target.value })}
                      data-testid="input-quote-expiry"
                    />
                  </div>
                  <div>
                    <Label>
                      Quote Document (PDF Required) <span className="text-destructive">*</span>
                    </Label>
                    <div className="mt-1 space-y-2">
                      <input
                        type="file"
                        id="quote-file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.type !== "application/pdf") {
                            toast({ title: "Invalid File Type", description: "Validation Error: A PDF copy of the official quote/itinerary is required to proceed", variant: "destructive" });
                            e.target.value = "";
                            return;
                          }
                          setPdfFile(file);
                          setPdfObjectPath("");
                          await uploadFile(file);
                        }}
                        data-testid="input-quote-file"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("quote-file")?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-quote"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploading ? `Uploading… ${progress}%` : "Choose PDF"}
                        </Button>
                        {pdfFile && pdfObjectPath && (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {pdfFile.name} — uploaded
                          </span>
                        )}
                        {pdfFile && !pdfObjectPath && !isUploading && (
                          <span className="text-sm text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Upload failed — try again
                          </span>
                        )}
                      </div>
                      {!pdfObjectPath && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Validation Error: A PDF copy of the official quote/itinerary is required to proceed
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="quote-notes">Notes (Optional)</Label>
                    <Textarea
                      id="quote-notes"
                      value={newQuote.notes}
                      onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                      placeholder="Additional details about this quote..."
                      rows={2}
                      data-testid="textarea-quote-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createQuoteMutation.mutate()}
                    disabled={
                      !newQuote.vendorName.trim() ||
                      !newQuote.quoteValue ||
                      !newQuote.quoteExpiry ||
                      !pdfObjectPath ||
                      isUploading ||
                      createQuoteMutation.isPending
                    }
                    data-testid="button-save-quote"
                  >
                    {createQuoteMutation.isPending ? "Saving..." : "Save Quote"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {quotes.length > 0 && (
              <>
                {quotes.length < minQuotes && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Policy requires {minQuotes} quotes.</strong> You have {quotes.length}.
                      Add {quotesDeficit} more quote{quotesDeficit !== 1 ? "s" : ""} to proceed.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedQuoteId && requiresJustification && (
                  <div>
                    <Label htmlFor="justification">Justification Required — Not selecting cheapest quote</Label>
                    <Textarea
                      id="justification"
                      value={quoteJustification}
                      onChange={(e) => setQuoteJustification(e.target.value)}
                      placeholder="Explain why you're not selecting the cheapest quote..."
                      rows={3}
                      data-testid="textarea-quote-justification"
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => submitWithQuotesMutation.mutate()}
                  disabled={!canSubmit || submitWithQuotesMutation.isPending}
                  data-testid="button-submit-with-quotes"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {submitWithQuotesMutation.isPending ? "Submitting..." : "Submit for Final Approval"}
                </Button>
              </>
            )}
          </>
        )}

        {request.status === "quotes_submitted" && selectedQuoteId && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Selected quote: {quotes.find(q => q.id === selectedQuoteId)?.vendorName} - {quotes.find(q => q.id === selectedQuoteId)?.currency} {quotes.find(q => q.id === selectedQuoteId)?.quoteValue.toFixed(2)}
              {quoteJustification && (
                <p className="mt-2 text-sm">Justification: {quoteJustification}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Approval Link Section — generates a secure HMAC token URL for manager to approve via email
function ApprovalLinkSection({ requestId, request }: { requestId: string; request: TravelRequest }) {
  const { toast } = useToast();
  const [approvalUrl, setApprovalUrl] = useState<string | undefined>(undefined);

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/requests/${requestId}/generate-approval-token`, {});
    },
    onSuccess: (data: any) => {
      setApprovalUrl(data.approvalUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate approval link", variant: "destructive" });
    },
  });

  const copyToClipboard = () => {
    if (approvalUrl) {
      navigator.clipboard.writeText(approvalUrl);
      toast({ title: "Copied!", description: "Approval link copied to clipboard" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Manager Approval Link
        </CardTitle>
        <CardDescription>
          Generate a secure link to send to the manager — they can approve or reject without logging in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.approvalToken && !approvalUrl ? (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              An approval link has already been generated for this request.
              Generate a new one to replace the existing link.
            </AlertDescription>
          </Alert>
        ) : null}

        {approvalUrl && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Approval URL (valid 7 days)</Label>
            <div className="flex gap-2">
              <Input value={approvalUrl} readOnly className="text-xs font-mono" data-testid="input-approval-url" />
              <Button variant="outline" size="icon" onClick={copyToClipboard} data-testid="button-copy-approval-url">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" asChild data-testid="button-open-approval-url">
                <a href={approvalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send this link to the manager. They can view all quotes side-by-side and approve or reject without a system login.
            </p>
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => generateTokenMutation.mutate()}
          disabled={generateTokenMutation.isPending}
          data-testid="button-generate-approval-link"
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          {generateTokenMutation.isPending ? "Generating..." : approvalUrl ? "Regenerate Link" : "Generate Approval Link"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [claimWizardOpen, setClaimWizardOpen] = useState(false);

  // Fetch the currently logged-in user so we can apply proper permission checks
  const { data: currentUser } = useQuery<{ id: string; role: string; firstName?: string; lastName?: string }>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch request details
  const { data: request, isLoading } = useQuery<TravelRequest>({
    queryKey: ["/api/requests", id],
    enabled: !!id,
  });

  // Fetch quotes (only when status requires quotes)
  const shouldFetchQuotes = request?.status === "awaiting_quotes" || request?.status === "quotes_submitted";
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<TravelQuote[]>({
    queryKey: ["/api/requests", id, "quotes"],
    enabled: !!id && shouldFetchQuotes,
  });

  // Fetch quote policy
  const { data: quotePolicy } = useQuery<QuotePolicy>({
    queryKey: ["/api/quote-policy"],
    enabled: shouldFetchQuotes,
  });

  // Fetch expense claims for this request
  const isApprovedOrCompleted = request?.status === "approved" || request?.status === "ticketed";
  const { data: expenseClaims = [] } = useQuery<ExpenseClaim[]>({
    queryKey: ["/api/requests", id, "expense-claims"],
    queryFn: async () => {
      const res = await fetch(`/api/requests/${id}/expense-claims`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json();
    },
    enabled: !!id && isApprovedOrCompleted,
  });

  // Approve mutation (supports both regular and pre-approval)
  const approveMutation = useMutation({
    mutationFn: async (options?: { approvalType?: string }) => {
      return apiRequest("POST", `/api/requests/${id}/approve`, {
        comment: comment.trim() || undefined,
        approvalType: options?.approvalType,
      });
    },
    onSuccess: async () => {
      // Invalidate ALL queries matching this key (active + inactive)
      // This ensures ManagerDashboard will refetch when it mounts
      queryClient.invalidateQueries({ 
        queryKey: ["/api/requests"]
      });
      
      toast({
        title: "Vinaka! Request Approved",
        description: "The travel request has been approved and moved to the next step.",
      });
      
      // Navigate back to the approvals queue
      setLocation("/approvals");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) {
        throw new Error("Comment required for rejection");
      }
      return apiRequest("POST", `/api/requests/${id}/reject`, {
        comment: comment.trim(),
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/requests"]
      });
      
      toast({
        title: "Request Rejected",
        description: "The travel request has been rejected.",
      });
      
      setLocation("/approvals");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading request details...
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            Request not found. The request ID may be invalid or you may not have permission to view it.
          </AlertDescription>
        </Alert>
        <Link href="/approvals">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Approvals
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<RequestStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      draft: { variant: "secondary", icon: Clock },
      submitted: { variant: "outline", icon: Clock },
      in_review: { variant: "default", icon: Clock },
      awaiting_quotes: { variant: "outline", icon: DollarSign },
      quotes_submitted: { variant: "default", icon: FileText },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      ticketed: { variant: "default", icon: CheckCircle },
    };
    return variants[status];
  };

  const StatusIcon = getStatusBadge(request.status).icon;

  // Determine if current user can approve/reject
  const isPendingApproval = request.status === "submitted" || request.status === "in_review";
  const isSuperAdmin = currentUser?.role === "super_admin";
  const currentUserId = currentUser?.id ?? "manager";
  const expectedApprover = request.approverFlow[request.approverIndex];
  // Super admin can always act on any request; others must be the expected approver
  const canTakeAction = isPendingApproval && (isSuperAdmin || currentUserId === expectedApprover);
  
  // Permission checks for RFQ workflow actions
  const canPreApprove = (request.status === "submitted" || request.status === "in_review") && (isSuperAdmin || currentUserId === expectedApprover);
  const canFinalApprove = request.status === "quotes_submitted" && (isSuperAdmin || currentUserId === expectedApprover);

  // Workflow stepper helper
  const stepIndex = (() => {
    switch (request.status) {
      case "draft": return 0;
      case "submitted": case "in_review": return 1;
      case "awaiting_quotes": return 2;
      case "quotes_submitted": return 3;
      case "approved": case "ticketed": return 4;
      case "rejected": return -1;
      default: return 1;
    }
  })();

  const daysUntilDeparture = Math.ceil(
    (new Date(request.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/approvals">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{request.employeeName}</h1>
            <Badge {...getStatusBadge(request.status)} data-testid="badge-request-status">
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {request.status.replace(/_/g, " ")}
            </Badge>
            {request.auditFlag && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" /> Out of Policy
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            {request.destination.city}, {request.destination.country}
            &nbsp;·&nbsp;
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            {format(new Date(request.startDate), "MMM dd")}–{format(new Date(request.endDate), "MMM dd, yyyy")}
            &nbsp;·&nbsp;{request.perDiem?.days} days
            &nbsp;·&nbsp;
            <span className="font-medium">FJD {request.perDiem?.totalFJD?.toFixed(2)}</span>
            &nbsp;·&nbsp;<span className="font-mono font-semibold text-primary" data-testid="text-ttr-number">{request.ttrNumber ?? request.id}</span>
          </p>
        </div>
      </div>

      {/* ── Workflow Progress Stepper ── */}
      {request.status !== "rejected" ? (
        <div className="flex items-center gap-0">
          {["Submitted", "Pre-Approved", "Quotes Collected", "Quotes Reviewed", "Approved"].map((label, i) => {
            const isDone = stepIndex > i;
            const isCurrent = stepIndex === i;
            const isLast = i === 4;
            return (
              <div key={label} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                    isDone
                      ? "bg-green-600 border-green-600 text-white"
                      : isCurrent
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center leading-tight hidden sm:block ${
                    isCurrent ? "font-semibold text-foreground" : isDone ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                  }`}>
                    {label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-1 mb-3 ${isDone ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Alert variant="destructive">
          <XCircle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">Request Declined</span>
            {request.reviewComment && ` — ${request.reviewComment}`}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Contextual Alerts ── */}
      {isPendingApproval && daysUntilDeparture <= 7 && daysUntilDeparture >= 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">URGENT:</span> Departure in {daysUntilDeparture} day{daysUntilDeparture !== 1 ? "s" : ""} — please review immediately
          </AlertDescription>
        </Alert>
      )}
      {request.auditFlag && request.auditNote && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">Out of Policy Note:</span> {request.auditNote}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Main Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Left: Tabbed information panel ── */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
              {shouldFetchQuotes && (
                <TabsTrigger value="vendors" data-testid="tab-vendors">Vendors &amp; Quotes</TabsTrigger>
              )}
            </TabsList>

            {/* ── Overview Tab ── */}
            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  {/* Traveller */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Traveller
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-semibold">{request.employeeName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Employee #</p>
                        <p className="font-medium">{request.employeeNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Position</p>
                        <p className="font-medium">{request.position}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium">{request.department}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Purpose */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Purpose of Travel</p>
                    <p className="text-sm leading-relaxed">{request.purpose}</p>
                  </div>

                  <Separator />

                  {/* Trip */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5" /> Trip Details
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Destination</p>
                        <p className="font-semibold">{request.destination.city}, {request.destination.country}</p>
                        <p className="text-xs text-muted-foreground">Airport code: {request.destination.code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Departs</p>
                        <p className="font-medium">{format(new Date(request.startDate), "MMM dd, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Returns</p>
                        <p className="font-medium">{format(new Date(request.endDate), "MMM dd, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">{request.perDiem?.days ?? "—"} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Flights</p>
                        <p className="font-medium">{request.needsFlights ? "Required" : "Not needed"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Accommodation</p>
                        <p className="font-medium">{request.needsAccommodation ? "Required" : "Not needed"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ground Transport</p>
                        <p className="font-medium">{request.needsTransport ? "Required" : "Not needed"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Visa Status</p>
                        <Badge variant={request.visaCheck?.status === "OK" ? "secondary" : "destructive"} className="text-xs mt-0.5">
                          {request.visaCheck?.message ?? "Not checked"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Financial Tab ── */}
            <TabsContent value="financial" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Budget Coding
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Cost Centre</p>
                        <p className="font-semibold">{request.costCentre.code}</p>
                        <p className="text-xs text-muted-foreground">{request.costCentre.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Funding Type</p>
                        <p className="font-medium capitalize">{request.fundingType}</p>
                      </div>
                      {request.totalEstimatedBudget && (
                        <div>
                          <p className="text-xs text-muted-foreground">Est. Total Budget</p>
                          <p className="font-medium">FJD {request.totalEstimatedBudget.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Per Diem Breakdown
                    </p>
                    {request.perDiem ? (
                      <div className="space-y-0 rounded-md border overflow-hidden">
                        {[
                          { label: "Daily MIE Rate", value: `FJD ${request.perDiem.mieFJD.toFixed(2)}` },
                          { label: "First Day (75%)", value: `FJD ${request.perDiem.firstDayFJD.toFixed(2)}` },
                          { label: `Middle Days (${Math.max(0, request.perDiem.days - 2)} days)`, value: `FJD ${request.perDiem.middleDaysFJD.toFixed(2)}` },
                          { label: "Last Day (75%)", value: `FJD ${request.perDiem.lastDayFJD.toFixed(2)}` },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between px-4 py-2.5 text-sm even:bg-muted/40">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium tabular-nums">{row.value}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-3 text-sm font-semibold bg-muted border-t">
                          <span>Total Per Diem</span>
                          <span className="text-primary tabular-nums">FJD {request.perDiem.totalFJD.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Per diem calculation pending.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Vendors & Quotes Tab ── */}
            {shouldFetchQuotes && (
              <TabsContent value="vendors" className="mt-4 space-y-4">
                {request.status === "awaiting_quotes" && (
                  <RfqSection requestId={id!} request={request} />
                )}
                <QuotesSection
                  requestId={id!}
                  request={request}
                  quotes={quotes}
                  quotesLoading={quotesLoading}
                  quotePolicy={quotePolicy}
                />
                {(request.status === "quotes_submitted" || request.status === "awaiting_quotes") && (
                  <ApprovalLinkSection requestId={id!} request={request} />
                )}
              </TabsContent>
            )}
          </Tabs>

          {/* ── Expense Claims Section (approved/ticketed trips only) ── */}
          {isApprovedOrCompleted && (
            <Card className="mt-5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    Expense Claims
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setClaimWizardOpen(true)}
                    data-testid="button-new-expense-claim"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Claim
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expenseClaims.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No expense claims yet. Submit receipts for reimbursement.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenseClaims.map(claim => (
                      <div key={claim.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border" data-testid={`claim-item-${claim.id}`}>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-primary" data-testid={`text-tcl-${claim.id}`}>
                            {claim.tclNumber ?? claim.id}
                          </p>
                          <p className="text-sm font-medium">
                            {claim.lineItems.length} item{claim.lineItems.length !== 1 ? "s" : ""} &middot; {claim.currency} {claim.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {claim.submittedAt
                              ? `Submitted ${format(new Date(claim.submittedAt), "d MMM yyyy")}`
                              : "Draft"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            claim.status === "approved" || claim.status === "paid" ? "default" :
                            claim.status === "rejected" ? "destructive" : "secondary"
                          }
                          className="capitalize shrink-0"
                          data-testid={`claim-status-${claim.id}`}
                        >
                          {claim.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Sticky action sidebar ── */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Step 1 decision — Pre-approval */}
          {canPreApprove && (
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <CardTitle className="text-base">Pre-Approval Required</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Pre-approve so the coordinator can collect vendor quotes. Final decision happens after quotes are reviewed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Comments (optional for pre-approval, required to decline)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  data-testid="textarea-decision-comment"
                />
                <Button
                  className="w-full"
                  onClick={() => approveMutation.mutate({ approvalType: "pre_approval" })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-pre-approve"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pre-Approve for Quote Collection
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => rejectMutation.mutate()}
                  disabled={approveMutation.isPending || rejectMutation.isPending || !comment.trim()}
                  data-testid="button-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Awaiting quotes — status info for approver */}
          {request.status === "awaiting_quotes" && !canFinalApprove && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950 shrink-0">
                    <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Waiting for Vendor Quotes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pre-approved. The coordinator is collecting vendor quotes. You'll be notified when quotes are ready.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2 decision — Final approval */}
          {request.status === "quotes_submitted" && canFinalApprove && (
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <CardTitle className="text-base">Final Approval</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Quotes have been submitted. Review them in the Vendors &amp; Quotes tab, then make your final decision.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.selectedQuoteId && (
                  <div className="p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm">
                    <p className="font-medium text-green-800 dark:text-green-300">Selected quote</p>
                    <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                      {quotes.find(q => q.id === request.selectedQuoteId)?.vendorName} — {quotes.find(q => q.id === request.selectedQuoteId)?.currency} {quotes.find(q => q.id === request.selectedQuoteId)?.quoteValue.toFixed(2)}
                    </p>
                  </div>
                )}
                <Textarea
                  placeholder="Final comments (optional for approval, required for rejection)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  data-testid="textarea-final-comment"
                />
                <Button
                  className="w-full"
                  onClick={() => approveMutation.mutate(undefined)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-final-approve"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Final Approve
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => rejectMutation.mutate()}
                  disabled={approveMutation.isPending || rejectMutation.isPending || !comment.trim()}
                  data-testid="button-final-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approved / ticketed state */}
          {(request.status === "approved" || request.status === "ticketed") && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-green-50 dark:bg-green-950 shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {request.status === "ticketed" ? "Ticketed" : "Approved"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This request has been fully approved{request.status === "ticketed" ? " and tickets have been issued" : ""}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Approval History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet.</p>
              ) : (
                <div className="space-y-0">
                  {request.history.map((entry, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          entry.action.includes("APPROVE") || entry.action.includes("PRE_APPROVE") ? "bg-green-500" :
                          entry.action.includes("REJECT") || entry.action.includes("DECLINE") ? "bg-red-500" :
                          "bg-blue-500"
                        }`} />
                        {index < request.history.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 mb-1" />
                        )}
                      </div>
                      <div className={`flex-1 ${index < request.history.length - 1 ? "pb-4" : ""}`}>
                        <p className="text-xs font-semibold">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">by {entry.actor}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.ts), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-foreground mt-1 italic">"{entry.note}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous review */}
          {request.reviewedBy && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Previous Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Reviewed By</p>
                  <p className="font-medium">{request.reviewedBy}</p>
                </div>
                {request.reviewedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Reviewed On</p>
                    <p>{format(new Date(request.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {request.reviewComment && (
                  <div>
                    <p className="text-xs text-muted-foreground">Comment</p>
                    <p className="italic">"{request.reviewComment}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Claim Wizard Dialog */}
      {id && (
        <ClaimWizard
          open={claimWizardOpen}
          onClose={() => setClaimWizardOpen(false)}
          preselectedRequestId={id}
        />
      )}
    </div>
  );
}
