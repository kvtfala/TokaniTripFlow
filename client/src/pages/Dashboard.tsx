import { useEffect } from "react";
import { useLocation } from "wouter";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { currentUser, isLoading } = useRole();

  // Redirect to role-specific dashboard (wait for auth to load)
  useEffect(() => {
    // Don't redirect until we've loaded the actual authenticated user
    if (isLoading) return;
    
    if (currentUser.role === "super_admin") {
      setLocation("/approvals");
    } else if (currentUser.role === "coordinator") {
      setLocation("/dashboard/coordinator");
    } else if (currentUser.role === "manager") {
      setLocation("/dashboard/manager");
    } else if (currentUser.role === "travel_desk") {
      setLocation("/dashboard/traveldesk");
    } else {
      setLocation("/dashboard/coordinator");
    }
  }, [currentUser.role, isLoading, setLocation]);

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
