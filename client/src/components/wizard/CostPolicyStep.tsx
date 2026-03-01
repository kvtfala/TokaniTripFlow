import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Upload, X, FileText } from "lucide-react";
import type { WizardFormData, CabinClass, CostBand } from "@shared/types";

interface CostPolicyStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function CostPolicyStep({ formData, updateFormData }: CostPolicyStepProps) {
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      updateFormData({ attachments: [...formData.attachments, ...files] });
      setFileInputKey(Date.now()); // Reset input
    }
  };

  const removeAttachment = (index: number) => {
    updateFormData({
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  // Simple policy check based on cabin class
  const checkPolicy = (cabin: CabinClass): void => {
    const policyCheck = cabin === "economy" 
      ? { status: "in_policy" as const }
      : { status: "out_of_policy" as const, reason: `${cabin === "business" ? "Business" : "Premium"} cabin above standard policy` };
    
    updateFormData({ 
      cabinClass: cabin,
      policyCheck 
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabin Class */}
      <div className="space-y-2">
        <Label>Cabin Requested *</Label>
        <Select value={formData.cabinClass} onValueChange={(value: CabinClass) => checkPolicy(value)}>
          <SelectTrigger data-testid="select-cabin-class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="economy" data-testid="option-economy">
              Economy (Standard)
            </SelectItem>
            <SelectItem value="premium" data-testid="option-premium">
              Premium Economy
            </SelectItem>
            <SelectItem value="business" data-testid="option-business">
              Business Class
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cost Band */}
      <div className="space-y-2">
        <Label>Estimated Cost Band *</Label>
        <Select value={formData.costBand} onValueChange={(value: CostBand) => updateFormData({ costBand: value })}>
          <SelectTrigger data-testid="select-cost-band">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="< FJD 1,000" data-testid="option-cost-1">
              &lt; FJD 1,000
            </SelectItem>
            <SelectItem value="FJD 1,000-3,000" data-testid="option-cost-2">
              FJD 1,000 - 3,000
            </SelectItem>
            <SelectItem value="FJD 3,000-5,000" data-testid="option-cost-3">
              FJD 3,000 - 5,000
            </SelectItem>
            <SelectItem value="> FJD 5,000" data-testid="option-cost-4">
              &gt; FJD 5,000
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Total Estimated Budget */}
      <div className="space-y-2">
        <Label htmlFor="total-budget">Total Estimated Budget (FJD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">FJD</span>
          <Input
            id="total-budget"
            type="number"
            min="0"
            step="50"
            value={formData.totalEstimatedBudget ?? ""}
            onChange={(e) => updateFormData({ totalEstimatedBudget: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="0.00"
            className="pl-12"
            data-testid="input-total-budget"
          />
        </div>
        {formData.totalEstimatedBudget !== undefined && formData.totalEstimatedBudget > 1000 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Budget exceeds FJD 1,000 — finance policy will require 3 vendor quotes to be collected after approval
          </p>
        )}
      </div>

      {/* Funding / Project Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="funding-code">Funding / Cost Code *</Label>
          <Input
            id="funding-code"
            value={formData.fundingCode}
            onChange={(e) => updateFormData({ fundingCode: e.target.value })}
            placeholder="e.g., CC-001"
            data-testid="input-funding-code"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-code">Project Code (Optional)</Label>
          <Input
            id="project-code"
            value={formData.projectCode}
            onChange={(e) => updateFormData({ projectCode: e.target.value })}
            placeholder="e.g., PROJ-2025-001"
            data-testid="input-project-code"
          />
        </div>
      </div>

      {/* Policy Status Indicator */}
      <Alert variant={formData.policyCheck.status === "in_policy" ? "default" : "destructive"}>
        <div className="flex items-start gap-3">
          {formData.policyCheck.status === "in_policy" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">Policy Status:</span>
              <Badge 
                variant={formData.policyCheck.status === "in_policy" ? "default" : "destructive"}
                data-testid="badge-policy-status"
              >
                {formData.policyCheck.status === "in_policy" ? "In Policy" : "Out of Policy"}
              </Badge>
            </div>
            {formData.policyCheck.reason && (
              <AlertDescription className="text-sm">
                {formData.policyCheck.reason}
              </AlertDescription>
            )}
          </div>
        </div>
      </Alert>

      {/* Attachments */}
      <div className="space-y-3">
        <Label>Attachments (Optional)</Label>
        <p className="text-sm text-muted-foreground">
          Upload conference invite, training letter, or supporting documents
        </p>
        
        <div className="flex items-center gap-2">
          <input
            key={fileInputKey}
            type="file"
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            id="file-upload"
            data-testid="input-file-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            data-testid="button-upload"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
          <span className="text-sm text-muted-foreground">
            {formData.attachments.length} file(s) attached
          </span>
        </div>

        {/* Attachment list */}
        {formData.attachments.length > 0 && (
          <div className="space-y-2">
            {formData.attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-md"
                data-testid={`attachment-${index}`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  data-testid={`button-remove-attachment-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
