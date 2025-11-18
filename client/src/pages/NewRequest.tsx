import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { TravelRequestWizard } from "@/components/wizard/TravelRequestWizard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WizardFormData } from "@shared/types";

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: WizardFormData) => {
      // Determine if finance approval is required
      const requiresFinance = 
        data.costBand === "> FJD 5,000" || 
        data.costBand === "FJD 3,000-5,000" ||
        data.policyCheck.status === "out_of_policy";

      // Build approval flow with finance inserted at correct position
      const approverFlow: string[] = [data.primaryApproverId];
      
      // Add any additional approvers
      if (data.additionalApprovers.length > 0) {
        approverFlow.push(...data.additionalApprovers);
      }
      
      // Insert finance approver if required (before travel_desk)
      if (requiresFinance) {
        approverFlow.push("emp_002"); // CFO Mere Delana approves high-cost/out-of-policy requests
      }
      
      // Always end with travel_desk
      approverFlow.push("travel_desk");

      // Convert wizard data to API format
      const requestData = {
        employeeName: data.travellers[0]?.name || "",
        employeeNumber: data.travellers[0]?.employeeNumber || "",
        position: data.travellers[0]?.position || "",
        department: data.travellers[0]?.department || "",
        employeeId: data.travellers[0]?.id || "employee",
        destination: data.destination || { code: "", city: "", country: "" },
        startDate: data.departureDate,
        endDate: data.returnDate || data.departureDate,
        purpose: data.purpose,
        costCentre: { code: data.fundingCode, name: data.fundingCode },
        fundingType: "advance" as const,
        approverFlow,
        approverIndex: 0,
        status: "submitted" as const,
        history: [{
          ts: new Date().toISOString(),
          actor: "coordinator",
          action: "SUBMIT" as const,
          note: `${data.isGroupRequest ? "Group request for " + data.travellers.length + " travellers" : "Request submitted"}`,
        }],
        needsFlights: true,
        needsAccommodation: true,
        needsVisa: data.destination?.country !== "Fiji",
        needsTransport: true,
        // Note: perDiem and visaCheck will be calculated by the backend
      };

      return apiRequest("POST", "/api/requests", requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Vinaka! Request Submitted",
        description: "Your travel request has been submitted for approval.",
      });
      setLocation("/my-trips");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit travel request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = (data: WizardFormData) => {
    // For now, just save to localStorage (already done in wizard)
    // In production, this would save to the backend
    toast({
      title: "Draft Saved",
      description: "Your progress has been saved and can be resumed later.",
    });
  };

  return (
    <TravelRequestWizard
      onSubmit={(data) => createMutation.mutate(data)}
      onSaveDraft={handleSaveDraft}
      isPending={createMutation.isPending}
    />
  );
}
