import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@shared/types";
import type { User } from "@shared/schema";

interface RoleContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Fallback user used only while the auth query is loading (before first response)
const DEFAULT_USER: User = {
  id: "user-default-001",
  email: "user@example.com",
  firstName: "User",
  lastName: null,
  role: "employee",
  profileImageUrl: null,
  companyCode: null,
  passwordHash: null,
  isActive: true,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function RoleProvider({ children }: { children: ReactNode }) {
  // Derive currentUser directly from the query — no useEffect/useState race condition.
  // When the TanStack Query cache is warm (shared with useAuth), this returns the
  // actual user on the very first render with no intermediate "default user" state.
  const { data: authUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const currentUser: User = authUser ?? DEFAULT_USER;

  // No-op kept for API compatibility — currentUser is always derived from auth cache.
  const setCurrentUser = (_user: User) => {};

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!currentUser.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(currentUser.role as UserRole);
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
    finance_admin: "Finance Admin",
    travel_admin: "Travel Admin",
    super_admin: "Super Admin",
  };
  return roleNames[role] || role;
}
