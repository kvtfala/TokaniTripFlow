import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { PerDiemPanel } from "./PerDiemPanel";
import { VisaCheckPanel } from "./VisaCheckPanel";
import { type Location, type PerDiemCalculation, type VisaCheckResult } from "@shared/types";

const formSchema = z.object({
  employeeName: z.string().min(2, "Name is required"),
  employeeNumber: z.string().min(1, "Employment number is required"),
  position: z.string().min(2, "Position is required"),
  department: z.string().min(2, "Department is required"),
  purpose: z.string().min(10, "Purpose must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface TravelRequestFormProps {
  onSubmit: (data: FormValues & { destination: Location; perDiem: PerDiemCalculation }) => void;
}

export function TravelRequestForm({ onSubmit }: TravelRequestFormProps) {
  const [destination, setDestination] = useState<Location | null>(null);
  const [perDiem, setPerDiem] = useState<PerDiemCalculation | null>(null);
  const [visaCheck, setVisaCheck] = useState<VisaCheckResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeName: "",
      employeeNumber: "",
      position: "",
      department: "",
      purpose: "",
      startDate: "",
      endDate: "",
    },
  });

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

  const handleFormSubmit = (data: FormValues) => {
    if (!destination || !perDiem) {
      console.error("Missing destination or per diem calculation");
      return;
    }
    onSubmit({ ...data, destination, perDiem });
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
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Travel Details</h3>
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
