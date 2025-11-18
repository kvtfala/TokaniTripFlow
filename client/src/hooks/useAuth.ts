// Replit Auth Integration
// Reference: blueprint:javascript_log_in_with_replit

import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include", // Important for session cookies
        });
        
        // 401 is expected when not authenticated - return null
        if (response.status === 401) {
          return null;
        }
        
        // Handle other errors
        if (!response.ok) {
          throw new Error(`${response.status}: Failed to fetch user`);
        }
        
        return await response.json();
      } catch (error) {
        // Network errors or other failures
        console.error("Auth check failed:", error);
        return null;
      }
    },
    retry: false,
    staleTime: 0, // Always check auth status when component mounts
  });

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
