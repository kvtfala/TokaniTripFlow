import { useEffect } from "react";
import { useLocation } from "wouter";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { currentUser } = useRole();

  // Redirect to role-specific dashboard
  useEffect(() => {
    if (currentUser.role === "coordinator") {
      setLocation("/dashboard/coordinator");
    } else if (currentUser.role === "manager") {
      setLocation("/dashboard/manager");
    } else {
      // Default to coordinator dashboard for demo
      // In production: show appropriate dashboard based on actual role
      setLocation("/dashboard/coordinator");
    }
  }, [currentUser.role, setLocation]);

  // Show loading while redirecting
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
