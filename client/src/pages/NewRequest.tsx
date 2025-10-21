import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TravelRequestForm } from "@/components/TravelRequestForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewRequest() {
  const [, setLocation] = useLocation();

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
            onSubmit={(data) => {
              console.log("Submitted:", data);
              alert("Travel request submitted successfully!");
              setLocation("/");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
