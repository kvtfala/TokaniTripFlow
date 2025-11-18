import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, X, Plus } from "lucide-react";
import { TRAVELLER_DIRECTORY } from "@/data/travellerDirectory";
import type { WizardFormData } from "@shared/types";

interface ApprovalRoutingStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function ApprovalRoutingStep({ formData, updateFormData }: ApprovalRoutingStepProps) {
  // Get managers and finance users for approval selection
  const managers = TRAVELLER_DIRECTORY.filter(t => 
    t.position.toLowerCase().includes('manager') || 
    t.position.toLowerCase().includes('ceo') ||
    t.position.toLowerCase().includes('cfo')
  );

  const financeUsers = TRAVELLER_DIRECTORY.filter(t => 
    t.department.toLowerCase().includes('finance')
  );

  const primaryApprover = TRAVELLER_DIRECTORY.find(t => t.id === formData.primaryApproverId);

  const addAdditionalApprover = (approverId: string) => {
    if (!formData.additionalApprovers.includes(approverId) && approverId !== formData.primaryApproverId) {
      updateFormData({
        additionalApprovers: [...formData.additionalApprovers, approverId],
      });
    }
  };

  const removeAdditionalApprover = (approverId: string) => {
    updateFormData({
      additionalApprovers: formData.additionalApprovers.filter(id => id !== approverId),
    });
  };

  // Determine approval path
  const requiresFinance = 
    formData.costBand === "> FJD 5,000" || 
    formData.costBand === "FJD 3,000-5,000" ||
    formData.policyCheck.status === "out_of_policy";

  const financeApprover = TRAVELLER_DIRECTORY.find(t => t.id === "emp_002"); // CFO

  // Build approval path matching submission logic order
  const approvalPath = [
    { role: "Manager", name: primaryApprover?.name || "Not selected" },
    ...formData.additionalApprovers.map(id => {
      const approver = TRAVELLER_DIRECTORY.find(t => t.id === id);
      return { role: "Additional", name: approver?.name || "Unknown" };
    }),
    ...(requiresFinance ? [{ role: "Finance", name: financeApprover?.name || "Finance Team" }] : []),
    { role: "Travel Desk", name: "Travel Desk Team" },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Approver */}
      <div className="space-y-2">
        <Label>Primary Approver (Manager) *</Label>
        <Select 
          value={formData.primaryApproverId} 
          onValueChange={(value) => updateFormData({ primaryApproverId: value })}
        >
          <SelectTrigger data-testid="select-primary-approver">
            <SelectValue placeholder="Select primary approver..." />
          </SelectTrigger>
          <SelectContent>
            {managers.map((manager) => (
              <SelectItem key={manager.id} value={manager.id} data-testid={`approver-${manager.id}`}>
                {manager.name} - {manager.position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Usually the traveller's line manager
        </p>
      </div>

      {/* Additional Approvers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Additional Approvers (Optional)</Label>
          {formData.additionalApprovers.length < 3 && (
            <Select onValueChange={addAdditionalApprover}>
              <SelectTrigger className="w-[200px]" data-testid="select-additional-approver">
                <SelectValue placeholder="Add approver..." />
              </SelectTrigger>
              <SelectContent>
                {managers
                  .filter(m => m.id !== formData.primaryApproverId && !formData.additionalApprovers.includes(m.id))
                  .map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                {financeUsers
                  .filter(f => f.id !== formData.primaryApproverId && !formData.additionalApprovers.includes(f.id))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} (Finance)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {formData.additionalApprovers.length > 0 && (
          <div className="space-y-2">
            {formData.additionalApprovers.map((approverId) => {
              const approver = TRAVELLER_DIRECTORY.find(t => t.id === approverId);
              return (
                <div
                  key={approverId}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`additional-approver-${approverId}`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{approver?.name}</span>
                    <span className="text-sm text-muted-foreground">· {approver?.position}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAdditionalApprover(approverId)}
                    data-testid={`button-remove-approver-${approverId}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Add project owner, HR, or other stakeholders who need to approve
        </p>
      </div>

      {/* Approval Path Preview */}
      <Card className="p-4 bg-muted/30">
        <Label className="text-sm font-semibold mb-3 block">Approval Path</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Request will follow this approval sequence:
        </p>
        
        <div className="space-y-3">
          {approvalPath.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Badge variant="outline" className="w-24 justify-center">
                  Step {index + 1}
                </Badge>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{step.role}</p>
                <p className="text-sm text-muted-foreground">{step.name}</p>
              </div>
            </div>
          ))}
        </div>

        {requiresFinance && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Note:</span> Finance approval required due to high cost or out-of-policy request
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
