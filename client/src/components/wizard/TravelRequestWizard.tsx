import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Save, Send } from "lucide-react";
import { type WizardFormData, type Traveller, type Location } from "@shared/types";
import { TravellerSelectionStep } from "./TravellerSelectionStep";
import { TripDetailsStep } from "./TripDetailsStep";
import { CostPolicyStep } from "./CostPolicyStep";
import { ApprovalRoutingStep } from "./ApprovalRoutingStep";
import { ReviewSubmitStep } from "./ReviewSubmitStep";

const STEPS = [
  { id: 1, title: "Traveller(s)", description: "Select who is traveling" },
  { id: 2, title: "Trip Details", description: "Route and dates" },
  { id: 3, title: "Cost & Policy", description: "Budget and compliance" },
  { id: 4, title: "Approval Routing", description: "Who will review" },
  { id: 5, title: "Review & Submit", description: "Final check" },
];

const INITIAL_FORM_DATA: WizardFormData = {
  travellers: [],
  isGroupRequest: false,
  tripType: "return",
  origin: "Nadi (NAN)",
  destination: null,
  departureDate: "",
  returnDate: "",
  datesFlexible: false,
  flexibilityDays: undefined,
  sectors: [],
  specialNotes: "",
  cabinClass: "economy",
  costBand: "< FJD 1,000",
  fundingCode: "",
  projectCode: "",
  attachments: [],
  policyCheck: { status: "in_policy" },
  primaryApproverId: "",
  additionalApprovers: [],
  purpose: "",
};

interface TravelRequestWizardProps {
  onSubmit: (data: WizardFormData) => void;
  onSaveDraft: (data: WizardFormData) => void;
  isPending?: boolean;
}

export function TravelRequestWizard({ onSubmit, onSaveDraft, isPending = false }: TravelRequestWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);

  // Load from localStorage if exists (autosave)
  useEffect(() => {
    const saved = localStorage.getItem("ttf_wizard_draft");
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        // Don't load attachments from localStorage as File objects can't be serialized
        setFormData({ ...parsedData, attachments: [] });
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const dataToSave = { ...formData, attachments: [] }; // Exclude File objects
      localStorage.setItem("ttf_wizard_draft", JSON.stringify(dataToSave));
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [formData]);

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
    localStorage.removeItem("ttf_wizard_draft");
  };

  const handleSaveDraft = () => {
    onSaveDraft(formData);
  };

  const progress = (currentStep / STEPS.length) * 100;

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.travellers.length > 0 && formData.purpose.trim().length >= 10;
      case 2:
        return (
          formData.destination !== null &&
          formData.departureDate !== "" &&
          (formData.tripType === "one-way" || formData.returnDate !== "")
        );
      case 3:
        return formData.fundingCode.trim() !== "";
      case 4:
        return formData.primaryApproverId !== "";
      case 5:
        return true;
      default:
        return false;
    }
  };

  const canProceed = isStepValid(currentStep);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">
            New Travel Request
          </h2>
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="mb-4" data-testid="wizard-progress" />
        <div className="flex items-center justify-between text-xs md:text-sm">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center flex-1 ${
                step.id === currentStep
                  ? "text-primary font-semibold"
                  : step.id < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
              data-testid={`step-indicator-${step.id}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id}
              </div>
              <span className="hidden md:block text-center">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <TravellerSelectionStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 2 && (
            <TripDetailsStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <CostPolicyStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 4 && (
            <ApprovalRoutingStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 5 && (
            <ReviewSubmitStep
              formData={formData}
            />
          )}
        </CardContent>
      </Card>

      {/* Auto-RFQ submit note — only shown on final step */}
      {currentStep === STEPS.length && (
        <p className="text-xs text-muted-foreground text-center" data-testid="text-submit-rfq-note">
          Upon manager pre-approval, RFQ emails will be automatically sent to all approved vendors.
        </p>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isPending}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isPending || formData.travellers.length === 0}
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed || isPending}
              data-testid="button-next-step"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || isPending}
              data-testid="button-submit-request"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
