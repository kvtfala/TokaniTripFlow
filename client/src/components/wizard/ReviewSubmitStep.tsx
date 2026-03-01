import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Plane, 
  CheckCircle, 
  AlertTriangle,
  Users,
  FileText,
  Building2,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { TRAVELLER_DIRECTORY } from "@/data/travellerDirectory";
import type { WizardFormData } from "@shared/types";

interface ReviewSubmitStepProps {
  formData: WizardFormData;
}

export function ReviewSubmitStep({ formData }: ReviewSubmitStepProps) {
  const primaryApprover = TRAVELLER_DIRECTORY.find(t => t.id === formData.primaryApproverId);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Review Your Request</h3>
        <p className="text-sm text-muted-foreground">
          Please review all details before submitting
        </p>
      </div>

      {/* Traveller(s) Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Traveller(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.travellers.map((traveller) => (
            <div key={traveller.id} className="flex items-start justify-between p-3 border rounded-md">
              <div>
                <p className="font-semibold">{traveller.name}</p>
                <p className="text-sm text-muted-foreground">
                  {traveller.position} · {traveller.department}
                </p>
              </div>
            </div>
          ))}
          {formData.isGroupRequest && (
            <Badge variant="outline" className="bg-primary/10">
              <Users className="w-3 h-3 mr-1" />
              Group Travel Request
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Trip Details Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="w-4 h-4" />
            Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Purpose</p>
            <p className="font-medium">{formData.purpose}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Trip Type</p>
              <Badge variant="outline" className="capitalize">
                {formData.tripType}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cabin Class</p>
              <Badge variant="outline" className="capitalize">
                {formData.cabinClass}
              </Badge>
            </div>
          </div>

          {formData.tripType !== "multi-city" && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{formData.origin}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{formData.destination?.city}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{formatDate(formData.departureDate)}</span>
                {formData.tripType === "return" && (
                  <>
                    <span className="text-muted-foreground">to</span>
                    <span className="font-medium">{formatDate(formData.returnDate)}</span>
                  </>
                )}
              </div>
            </>
          )}

          {formData.tripType === "multi-city" && formData.sectors && formData.sectors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Sectors:</p>
              {formData.sectors.map((sector, index) => (
                <div key={sector.id} className="flex items-center gap-2 text-sm pl-4">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{sector.origin}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{sector.destination}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{formatDate(sector.date)}</span>
                </div>
              ))}
            </div>
          )}

          {formData.datesFlexible && (
            <div className="text-sm text-muted-foreground">
              Dates flexible: ±{formData.flexibilityDays} days
            </div>
          )}

          {formData.specialNotes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Special Notes</p>
                <p className="text-sm">{formData.specialNotes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cost & Policy Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost & Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estimated Cost Band</p>
              <Badge variant="outline">{formData.costBand}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Funding Code</p>
              <p className="font-medium">{formData.fundingCode}</p>
            </div>
          </div>

          {formData.projectCode && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Project Code</p>
              <p className="font-medium">{formData.projectCode}</p>
            </div>
          )}

          <Separator />

          <div className="flex items-start gap-3 p-3 border rounded-md">
            {formData.policyCheck.status === "in_policy" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">Policy Status:</span>
                <Badge variant={formData.policyCheck.status === "in_policy" ? "default" : "destructive"}>
                  {formData.policyCheck.status === "in_policy" ? "In Policy" : "Out of Policy"}
                </Badge>
              </div>
              {formData.policyCheck.reason && (
                <p className="text-sm text-muted-foreground">{formData.policyCheck.reason}</p>
              )}
            </div>
          </div>

          {formData.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Attachments ({formData.attachments.length})</p>
                </div>
                <div className="space-y-1">
                  {formData.attachments.map((file, index) => (
                    <p key={index} className="text-sm text-muted-foreground pl-6">
                      • {file.name}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Auto-RFQ Notice */}
      <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3" data-testid="notice-auto-rfq">
        <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300">Vendor RFQs sent automatically</p>
          <p className="text-blue-700 dark:text-blue-400 mt-0.5">
            Once your manager pre-approves this request, Request for Quotation emails will be automatically sent to all approved vendors in the system. No further action is required from you.
          </p>
        </div>
      </div>

      {/* Approval Path Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Approval Path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            // Build approval sequence to match submission logic
            const requiresFinance = 
              formData.costBand === "> FJD 5,000" || 
              formData.costBand === "FJD 3,000-5,000" ||
              formData.policyCheck.status === "out_of_policy";

            let stepNumber = 1;
            const steps = [];

            // Step 1: Manager
            steps.push(
              <div key="manager" className="flex items-center gap-2">
                <Badge variant="outline">Step {stepNumber++}</Badge>
                <span className="font-medium">Manager:</span>
                <span>{primaryApprover?.name || "Not selected"}</span>
              </div>
            );

            // Additional approvers
            formData.additionalApprovers.forEach((approverId) => {
              const approver = TRAVELLER_DIRECTORY.find(t => t.id === approverId);
              steps.push(
                <div key={approverId} className="flex items-center gap-2">
                  <Badge variant="outline">Step {stepNumber++}</Badge>
                  <span>{approver?.name}</span>
                </div>
              );
            });

            // Finance (if required)
            if (requiresFinance) {
              const financeApprover = TRAVELLER_DIRECTORY.find(t => t.id === "emp_002"); // CFO
              steps.push(
                <div key="finance" className="flex items-center gap-2">
                  <Badge variant="outline">Step {stepNumber++}</Badge>
                  <span className="font-medium">Finance:</span>
                  <span>{financeApprover?.name || "Finance Team"}</span>
                </div>
              );
            }

            // Final: Travel Desk
            steps.push(
              <div key="travel-desk" className="flex items-center gap-2">
                <Badge variant="outline">Final</Badge>
                <span className="font-medium">Travel Desk</span>
              </div>
            );

            return steps;
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
