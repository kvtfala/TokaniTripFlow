import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ExternalLink
} from "lucide-react";
import type { Vendor } from "@shared/schema";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelRequest, RequestStatus, TravelQuote, QuotePolicy } from "@shared/types";

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
    if (request.selectedQuoteId !== selectedQuoteId) setSelectedQuoteId(request.selectedQuoteId);
    if (request.quoteJustification !== quoteJustification) setQuoteJustification(request.quoteJustification || "");
  }, [request.selectedQuoteId, request.quoteJustification, selectedQuoteId, quoteJustification]);
  
  const [newQuote, setNewQuote] = useState({
    vendorName: "",
    quoteValue: "",
    currency: "FJD",
    quoteExpiry: "",
    notes: "",
    attachmentName: "",
  });

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/requests/${requestId}/quotes`, {
        vendorName: newQuote.vendorName.trim(),
        quoteValue: parseFloat(newQuote.quoteValue),
        currency: newQuote.currency,
        quoteExpiry: newQuote.quoteExpiry,
        notes: newQuote.notes.trim() || undefined,
        attachmentUrl: newQuote.attachmentName ? `[attached: ${newQuote.attachmentName}]` : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      setDialogOpen(false);
      setNewQuote({ vendorName: "", quoteValue: "", currency: "FJD", quoteExpiry: "", notes: "", attachmentName: "" });
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
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {quote.attachmentUrl}
                        </p>
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    <Label>Quote Document</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="file"
                        id="quote-file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setNewQuote({ ...newQuote, attachmentName: file.name });
                        }}
                        data-testid="input-quote-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("quote-file")?.click()}
                        data-testid="button-upload-quote"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Quote
                      </Button>
                      {newQuote.attachmentName && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {newQuote.attachmentName}
                        </span>
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
      
      // Navigate back - dashboard will auto-refetch due to invalidation
      setLocation("/dashboard/manager");
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
      // Invalidate ALL queries matching this key (active + inactive)
      // This ensures ManagerDashboard will refetch when it mounts
      queryClient.invalidateQueries({ 
        queryKey: ["/api/requests"]
      });
      
      toast({
        title: "Request Rejected",
        description: "The travel request has been rejected.",
      });
      
      // Navigate back - dashboard will auto-refetch due to invalidation
      setLocation("/dashboard/manager");
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
        <Link href="/dashboard/manager">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manager">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Travel Request Details</h1>
          <p className="text-muted-foreground mt-1">Request ID: {request.id}</p>
        </div>
        <Badge {...getStatusBadge(request.status)} data-testid="badge-request-status">
          <StatusIcon className="w-4 h-4 mr-1" />
          {request.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Urgent alert */}
      {isPendingApproval && (() => {
        const daysUntil = Math.ceil(
          (new Date(request.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7) {
          return (
            <Alert variant="destructive">
              <AlertTriangle className="w-5 h-5" />
              <AlertDescription className="ml-2">
                <span className="font-semibold">URGENT:</span> Travel departure in {daysUntil} days - please review immediately
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

      {/* Out of policy alert */}
      {request.auditFlag && (
        <Alert variant="destructive">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">Out of Policy:</span> {request.auditNote}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Traveller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Traveller Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold text-lg">{request.employeeName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee Number</p>
                  <p className="font-medium">{request.employeeNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{request.position}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{request.department}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Purpose of Travel</p>
                <p className="font-medium">{request.purpose}</p>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-semibold text-lg">
                    {request.destination.city}, {request.destination.country}
                  </p>
                  <p className="text-sm text-muted-foreground">Airport: {request.destination.code}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Travel Dates</p>
                  <p className="font-medium">
                    {format(new Date(request.startDate), "MMMM dd, yyyy")} - {format(new Date(request.endDate), "MMMM dd, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {request.perDiem?.days ?? "—"} days
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Flights Required</p>
                  <p className="font-medium">{request.needsFlights ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accommodation</p>
                  <p className="font-medium">{request.needsAccommodation ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Visa Required</p>
                  <Badge variant={request.visaCheck?.status === "OK" ? "default" : "destructive"}>
                    {request.visaCheck?.message ?? "Not checked"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ground Transport</p>
                  <p className="font-medium">{request.needsTransport ? "Yes" : "No"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cost Centre</p>
                  <p className="font-medium">{request.costCentre.code}</p>
                  <p className="text-xs text-muted-foreground">{request.costCentre.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Funding Type</p>
                  <p className="font-medium capitalize">{request.fundingType}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-semibold mb-2">Per Diem Calculation</p>
                {request.perDiem ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily MIE Rate:</span>
                    <span className="font-medium">FJD {request.perDiem.mieFJD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First Day (75%):</span>
                    <span className="font-medium">FJD {request.perDiem.firstDayFJD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Middle Days ({request.perDiem.days - 2} days):</span>
                    <span className="font-medium">FJD {request.perDiem.middleDaysFJD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Day (75%):</span>
                    <span className="font-medium">FJD {request.perDiem.lastDayFJD.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Per Diem:</span>
                    <span className="text-primary">FJD {request.perDiem.totalFJD.toFixed(2)}</span>
                  </div>
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">Per diem calculation pending.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column on large screens */}
        <div className="space-y-6">
          {/* Approval Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Approval Timeline
              </CardTitle>
              <CardDescription>
                {isPendingApproval ? "Current approval progress" : "Completed approval flow"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.history.map((entry, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${
                        entry.action === "APPROVE" ? "bg-green-600" : 
                        entry.action === "REJECT" ? "bg-red-600" : 
                        "bg-blue-600"
                      }`} />
                      {index < request.history.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">
                        by {entry.actor}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.ts), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                      {entry.note && (
                        <p className="text-sm mt-1">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RFQ Section - For Coordinators when status is awaiting_quotes */}
          {request.status === "awaiting_quotes" && (
            <RfqSection requestId={id!} request={request} />
          )}

          {/* Quotes Section - Show when quotes exist or can be added */}
          {shouldFetchQuotes && (
            <QuotesSection 
              requestId={id!}
              request={request}
              quotes={quotes}
              quotesLoading={quotesLoading}
              quotePolicy={quotePolicy}
            />
          )}

          {/* Generate Tokenized Approval Link */}
          {(request.status === "quotes_submitted" || request.status === "awaiting_quotes") && (
            <ApprovalLinkSection requestId={id!} request={request} />
          )}

          {/* Decision Section (for managers) */}
          {canTakeAction && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Make Decision</CardTitle>
                <CardDescription>
                  {request.status === "submitted" || request.status === "in_review"
                    ? "Approve, pre-approve for quotes, or reject this request"
                    : "Approve or reject this travel request"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Comments {!comment.trim() && "(optional for approval, required for rejection)"}
                  </label>
                  <Textarea
                    placeholder="Add any comments or justification..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    data-testid="textarea-decision-comment"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {/* Pre-approval button (only for submitted/in_review and authorized approvers) */}
                  {canPreApprove && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => approveMutation.mutate({ approvalType: "pre_approval" })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="w-full"
                        data-testid="button-pre-approve"
                      >
                        <DollarSign className="w-5 h-5 mr-2" />
                        Pre-Approve to Collect Quotes
                      </Button>
                      <p className="text-xs text-muted-foreground px-1">
                        Pre-approval allows coordinator to gather vendor quotes before final approval
                      </p>
                      <Separator />
                    </>
                  )}

                  {/* Regular/Final approval button */}
                  <Button
                    size="lg"
                    onClick={() => approveMutation.mutate(undefined)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="w-full"
                    data-testid="button-approve"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {request.status === "quotes_submitted" ? "Final Approve" : "Approve Request"}
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => rejectMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending || !comment.trim()}
                    className="w-full"
                    data-testid="button-reject"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Decision Section for final approval of quotes */}
          {request.status === "quotes_submitted" && canFinalApprove && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Final Approval</CardTitle>
                <CardDescription>
                  Review selected quote and approve or reject
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.selectedQuoteId && (
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      Selected quote: {quotes.find(q => q.id === request.selectedQuoteId)?.vendorName} - {quotes.find(q => q.id === request.selectedQuoteId)?.currency} {quotes.find(q => q.id === request.selectedQuoteId)?.quoteValue.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Final Review Comments {!comment.trim() && "(optional for approval, required for rejection)"}
                  </label>
                  <Textarea
                    placeholder="Add any comments about the selected quote..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    data-testid="textarea-final-comment"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={() => approveMutation.mutate(undefined)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="w-full"
                    data-testid="button-final-approve"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Final Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => rejectMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending || !comment.trim()}
                    className="w-full"
                    data-testid="button-final-reject"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous review (if exists) */}
          {request.reviewedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Previous Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed By</p>
                  <p className="font-medium">{request.reviewedBy}</p>
                </div>
                {request.reviewedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed On</p>
                    <p className="text-sm">{format(new Date(request.reviewedAt), "MMM dd, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {request.reviewComment && (
                  <div>
                    <p className="text-sm text-muted-foreground">Comment</p>
                    <p className="text-sm">{request.reviewComment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
