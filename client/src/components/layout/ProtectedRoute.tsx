import { Redirect } from "wouter";
import { useRole } from "@/contexts/RoleContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: string;
}

export function ProtectedRoute({ allowedRoles, children, fallback = "/" }: ProtectedRouteProps) {
  const { currentUser, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = currentUser?.role || "employee";

  if (!allowedRoles.includes(role)) {
    return <Redirect to={fallback} />;
  }

  return <>{children}</>;
}
