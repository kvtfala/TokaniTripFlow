import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@shared/types";

interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  email?: string;
}

interface RoleContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Fallback user when not authenticated
const DEFAULT_USER: User = {
  id: "coord_001",
  name: "Salote Ratuvuki",
  role: "coordinator",
  department: "HR",
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  
  // Fetch authenticated user from Replit Auth
  const { data: authUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update currentUser when auth data is available
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  const hasRole = (roles: UserRole | UserRole[]) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(currentUser.role);
  };

  return (
    <RoleContext.Provider value={{ currentUser, setCurrentUser, hasRole, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

// Convenience hook to get current user role
export function useCurrentRole() {
  const { currentUser } = useRole();
  return currentUser.role;
}

// Helper function to get user-friendly role name
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    employee: "Employee",
    coordinator: "Travel Coordinator",
    manager: "Manager",
    finance: "Finance",
    travel_desk: "Travel Desk",
    admin: "Administrator",
  };
  return roleNames[role] || role;
}
