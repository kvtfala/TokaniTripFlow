import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { PerDiemPanel } from "./PerDiemPanel";
import { VisaCheckPanel } from "./VisaCheckPanel";
import { type Location, type PerDiemCalculation, type VisaCheckResult, type CostCentre } from "@shared/types";
import { CostCentreAdapter } from "@/data/adapters/CostCentreAdapter";
import { BudgetAdapter } from "@/data/adapters/BudgetAdapter";
import { AlertTriangle } from "lucide-react";

const formSchema = z.object({
  employeeName: z.string().min(2, "Name is required"),
  employeeNumber: z.string().min(1, "Employment number is required"),
  position: z.string().min(2, "Position is required"),
  department: z.string().min(2, "Department is required"),
  costCentre: z.string().min(1, "Cost centre is required"),
  fundingType: z.enum(["advance", "reimbursement"], {
    required_error: "Please select a funding type",
  }),
  purpose: z.string().min(10, "Purpose must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  needsFlights: z.boolean().default(false),
  needsAccommodation: z.boolean().default(false),
  needsVisa: z.boolean().default(false),
  needsTransport: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface TravelRequestFormProps {
  onSubmit: (data: Omit<FormValues, "costCentre"> & { destination: Location; perDiem: PerDiemCalculation; costCentre: CostCentre }) => void;
}

export function TravelRequestForm({ onSubmit }: TravelRequestFormProps) {
  const [destination, setDestination] = useState<Location | null>(null);
  const [perDiem, setPerDiem] = useState<PerDiemCalculation | null>(null);
  const [visaCheck, setVisaCheck] = useState<VisaCheckResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [budgetWarning, setBudgetWarning] = useState<{ show: boolean; available: number; estimated: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeName: "",
      employeeNumber: "",
      position: "",
      department: "",
      costCentre: "",
      fundingType: "reimbursement",
      purpose: "",
      startDate: "",
      endDate: "",
      needsFlights: false,
      needsAccommodation: false,
      needsVisa: false,
      needsTransport: false,
    },
  });

  // Load cost centres on mount
  useEffect(() => {
    CostCentreAdapter.list()
      .then(setCostCentres)
      .catch((error) => {
        console.error("Failed to load cost centres:", error);
        setLoadError("Failed to load cost centres. Please refresh the page.");
        // Set empty array on error so form still works
        setCostCentres([]);
      });
  }, []);

  const handleDestinationChange = (location: Location) => {
    setDestination(location);
    checkVisa(location);
    recalculatePerDiem(location, form.getValues("startDate"), form.getValues("endDate"));
  };

  const handleDateChange = () => {
    const { startDate, endDate } = form.getValues();
    if (destination && startDate && endDate) {
      recalculatePerDiem(destination, startDate, endDate);
    }
  };

  // todo: remove mock functionality - replace with actual API
  const checkVisa = (location: Location) => {
    if (location.country === "Australia") {
      setVisaCheck({
        status: "ACTION",
        message: "Visa required for Australia. Processing time: 2-4 weeks.",
        policyLink: "#",
      });
    } else if (location.country === "United States") {
      setVisaCheck({
        status: "WARNING",
        message: "Electronic travel authorization may be required. Please verify.",
        policyLink: "#",
      });
    } else {
      setVisaCheck({
        status: "OK",
        message: "No visa required for this destination.",
      });
    }
  };

  // todo: remove mock functionality - replace with actual API
  const recalculatePerDiem = (location: Location, startDate: string, endDate: string) => {
    if (!startDate || !endDate) return;
    
    setIsCalculating(true);
    setTimeout(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      const mieFJD = 100;
      const firstDayFJD = mieFJD * 0.75;
      const middleDaysFJD = Math.max(0, days - 2) * mieFJD;
      const lastDayFJD = days > 1 ? mieFJD * 0.75 : 0;
      const totalFJD = firstDayFJD + middleDaysFJD + lastDayFJD;

      setPerDiem({
        totalFJD,
        days,
        mieFJD,
        firstDayFJD,
        middleDaysFJD,
        lastDayFJD,
      });
      setIsCalculating(false);
    }, 500);
  };

  const checkBudget = async (costCentreCode: string, estimatedTotal: number) => {
    if (!costCentreCode || !estimatedTotal) return;
    
    try {
      const available = await BudgetAdapter.getAvailableFor(costCentreCode);
      if (estimatedTotal > available) {
        setBudgetWarning({ show: true, available, estimated: estimatedTotal });
      } else {
        setBudgetWarning(null);
      }
    } catch (error) {
      console.error("Failed to check budget:", error);
      setLoadError("Budget check unavailable. You may still submit your request.");
      // Don't block form submission on budget check failure
      setBudgetWarning(null);
    }
  };

  const handleCostCentreChange = (costCentreCode: string) => {
    if (perDiem) {
      checkBudget(costCentreCode, perDiem.totalFJD);
    }
  };

  const handleFormSubmit = (data: FormValues) => {
    if (!destination || !perDiem) {
      console.error("Missing destination or per diem calculation");
      return;
    }
    
    // Find the full cost centre object
    const selectedCostCentre = costCentres.find(cc => cc.code === data.costCentre);
    if (!selectedCostCentre) {
      console.error("Cost centre not found");
      return;
    }
    
    // Remove costCentre string from data and add the object
    const { costCentre: _, ...formDataWithoutCostCentre } = data;
    
    // Submit with full cost centre object
    onSubmit({ 
      ...formDataWithoutCostCentre, 
      destination, 
      perDiem,
      costCentre: selectedCostCentre 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Staff Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="employeeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Jone Vakatawa"
                      className="h-12"
                      {...field}
                      data-testid="input-employee-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., EMP001"
                      className="h-12"
                      {...field}
                      data-testid="input-employee-number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Senior Analyst"
                      className="h-12"
                      {...field}
                      data-testid="input-position"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Finance"
                      className="h-12"
                      {...field}
                      data-testid="input-department"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costCentre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Centre</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleCostCentreChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12" data-testid="select-cost-centre">
                        <SelectValue placeholder="Select cost centre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCentres.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Used for budget tracking and finance reconciliation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fundingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12" data-testid="select-funding-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="reimbursement">Reimbursement</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Advance: Funds provided before travel. Reimbursement: Paid after trip
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Travel Details</h3>
          
          {loadError && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          
          {budgetWarning?.show && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Over budget for selected cost centre!</strong>
                <br />
                Available: FJD {budgetWarning.available.toFixed(2)} | 
                Estimated: FJD {budgetWarning.estimated.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel Purpose</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Regional conference attendance, client meeting..."
                      className="resize-none"
                      {...field}
                      data-testid="input-purpose"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="text-sm font-medium mb-2 block">Destination</label>
              <LocationAutocomplete
                value={destination}
                onSelect={handleDestinationChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleDateChange();
                        }}
                        className="h-12"
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleDateChange();
                        }}
                        className="h-12"
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {visaCheck && <VisaCheckPanel result={visaCheck} />}

            <PerDiemPanel calculation={perDiem} loading={isCalculating} />

            <div className="space-y-3">
              <label className="text-sm font-medium">Services Required</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="needsFlights"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-needs-flights"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Flight Booking
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="needsAccommodation"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-needs-accommodation"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Accommodation
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="needsVisa"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-needs-visa"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Visa Assistance
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="needsTransport"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-needs-transport"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Ground Transport
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12"
          disabled={!destination || !perDiem}
          data-testid="button-submit-request"
        >
          Submit Travel Request
        </Button>
      </form>
    </Form>
  );
}
