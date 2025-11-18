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
  Star
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TravelRequest, RequestStatus, TravelQuote, QuotePolicy } from "@shared/types";

// RFQ Section Component
function RfqSection({ requestId, request }: { requestId: string; request: TravelRequest }) {
  const { toast } = useToast();
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendors, setVendors] = useState<Array<{ vendorName: string; email: string }>>([]);

  const sendRfqMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/requests/${requestId}/send-rfq`, { vendors });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      setVendors([]);
      toast({
        title: "RFQ Sent Successfully",
        description: `Request for Quote sent to ${vendors.length} vendor(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send RFQ. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addVendor = () => {
    if (!vendorName.trim() || !vendorEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both vendor name and email",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate
    if (vendors.some(v => v.email.toLowerCase() === vendorEmail.toLowerCase())) {
      toast({
        title: "Duplicate Email",
        description: "This vendor email is already in the list",
        variant: "destructive",
      });
      return;
    }

    setVendors([...vendors, { vendorName: vendorName.trim(), email: vendorEmail.trim() }]);
    setVendorName("");
    setVendorEmail("");
  };

  const removeVendor = (email: string) => {
    setVendors(vendors.filter(v => v.email !== email));
  };

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send RFQ to Vendors
        </CardTitle>
        <CardDescription>
          Request quotes from travel vendors for this trip
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show already sent RFQs */}
        {request.rfqRecipients && request.rfqRecipients.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">RFQ Already Sent To:</p>
            <div className="space-y-1">
              {request.rfqRecipients.map((recipient, idx) => (
                <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  {recipient.vendorName} ({recipient.email}) - {format(new Date(recipient.sentAt), "MMM dd, yyyy")}
                </div>
              ))}
            </div>
            <Separator className="mt-3" />
          </div>
        )}

        {/* Add vendor form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vendor-name">Vendor Name</Label>
            <Input
              id="vendor-name"
              placeholder="e.g., Pacific Travel Services"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              data-testid="input-vendor-name"
            />
          </div>
          <div>
            <Label htmlFor="vendor-email">Vendor Email</Label>
            <div className="flex gap-2">
              <Input
                id="vendor-email"
                type="email"
                placeholder="vendor@example.com"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addVendor()}
                data-testid="input-vendor-email"
              />
              <Button
                type="button"
                onClick={addVendor}
                variant="outline"
                data-testid="button-add-vendor"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Vendor list */}
        {vendors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Vendors to Contact ({vendors.length}):</p>
            {vendors.map((vendor) => (
              <div key={vendor.email} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex-1">
                  <p className="text-sm font-medium">{vendor.vendorName}</p>
                  <p className="text-xs text-muted-foreground">{vendor.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVendor(vendor.email)}
                  data-testid={`button-remove-vendor-${vendor.email}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => sendRfqMutation.mutate()}
          disabled={vendors.length === 0 || sendRfqMutation.isPending}
          data-testid="button-send-rfq"
        >
          <Send className="w-4 h-4 mr-2" />
          Send RFQ to {vendors.length} Vendor{vendors.length !== 1 && "s"}
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
  
  // Sync selectedQuoteId state with request data when it changes
  useEffect(() => {
    if (request.selectedQuoteId !== selectedQuoteId) {
      setSelectedQuoteId(request.selectedQuoteId);
    }
    if (request.quoteJustification !== quoteJustification) {
      setQuoteJustification(request.quoteJustification || "");
    }
  }, [request.selectedQuoteId, request.quoteJustification, selectedQuoteId, quoteJustification]);
  
  // New quote form state
  const [newQuote, setNewQuote] = useState({
    vendorName: "",
    quoteValue: "",
    currency: "FJD",
    quoteExpiry: "",
    notes: "",
  });

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/requests/${requestId}/quotes`, {
        vendorName: newQuote.vendorName.trim(),
        quoteValue: parseFloat(newQuote.quoteValue),
        currency: newQuote.currency,
        quoteExpiry: newQuote.quoteExpiry,
        notes: newQuote.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      setDialogOpen(false);
      setNewQuote({ vendorName: "", quoteValue: "", currency: "FJD", quoteExpiry: "", notes: "" });
      toast({
        title: "Quote Added",
        description: "Vendor quote has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add quote. Please try again.",
        variant: "destructive",
      });
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
  const minQuotes = isInternational ? (quotePolicy?.minQuotesInternational || 3) : (quotePolicy?.minQuotesDomestic || 2);
  const cheapestQuote = quotes.length > 0 ? quotes.reduce((min, q) => q.quoteValue < min.quoteValue ? q : min) : null;
  const requiresJustification = selectedQuoteId && cheapestQuote && selectedQuoteId !== cheapestQuote.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Vendor Quotes
        </CardTitle>
        <CardDescription>
          {isInternational ? "International" : "Domestic"} trip - Minimum {minQuotes} quotes required
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{quote.vendorName}</p>
                        {quote.id === cheapestQuote?.id && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Cheapest
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quote.currency} {quote.quoteValue.toFixed(2)} • Valid until {quote.quoteExpiry ? format(new Date(quote.quoteExpiry), "MMM dd, yyyy") : "N/A"}
                      </p>
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
                      placeholder="e.g., Pacific Travel Services"
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
                    <Label htmlFor="quote-notes">Notes (Optional)</Label>
                    <Textarea
                      id="quote-notes"
                      value={newQuote.notes}
                      onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                      placeholder="Additional details about this quote..."
                      rows={3}
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
                    Save Quote
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {quotes.length > 0 && (
              <>
                {quotes.length < minQuotes && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Policy requires {minQuotes} quotes. You have {quotes.length}. Add {minQuotes - quotes.length} more quote(s) to proceed.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedQuoteId && requiresJustification && (
                  <div>
                    <Label htmlFor="justification">Justification (Required - Not selecting cheapest quote)</Label>
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
                  disabled={
                    !selectedQuoteId ||
                    quotes.length < minQuotes ||
                    (requiresJustification && !quoteJustification.trim()) ||
                    submitWithQuotesMutation.isPending
                  }
                  data-testid="button-submit-with-quotes"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit for Final Approval
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

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [comment, setComment] = useState("");

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
  // TODO: Replace with actual user from session
  const currentUserId = "manager"; // Hardcoded for testing - matches backend
  const expectedApprover = request.approverFlow[request.approverIndex];
  const canTakeAction = isPendingApproval && currentUserId === expectedApprover;
  
  // Permission checks for RFQ workflow actions
  const canPreApprove = (request.status === "submitted" || request.status === "in_review") && currentUserId === expectedApprover;
  const canFinalApprove = request.status === "quotes_submitted" && currentUserId === expectedApprover;

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
                    Duration: {request.perDiem.days} days
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
                  <Badge variant={request.visaCheck.status === "OK" ? "default" : "destructive"}>
                    {request.visaCheck.message}
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
