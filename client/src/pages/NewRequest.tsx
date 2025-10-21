import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TravelRequestForm } from "@/components/TravelRequestForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const requestData = {
        ...data,
        employeeId: "employee", // In production, use actual user ID from auth
        approverFlow: ["manager", "finance_admin"], // In production, determine from org structure
        status: "submitted",
      };
      return apiRequest("POST", "/api/requests", requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Success!",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Travel Request</h1>
          <p className="text-muted-foreground mt-1">Submit a new travel request for approval</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Travel Details</CardTitle>
          <CardDescription>
            Complete the form below to submit your travel request. Per diem will be calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TravelRequestForm
            onSubmit={(data) => createMutation.mutate(data)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
