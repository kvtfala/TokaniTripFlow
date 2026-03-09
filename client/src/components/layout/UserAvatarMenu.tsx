import { Link } from "wouter";
import { Users, Settings, LogOut, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRole } from "@/contexts/RoleContext";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  coordinator: "Travel Coordinator",
  manager: "Manager",
  finance_admin: "Finance Admin",
  travel_admin: "Travel Admin",
  super_admin: "Super Admin",
};

const ADMIN_ROLES = ["manager", "super_admin", "finance_admin", "travel_admin"];

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function getFullName(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (email) return email.split("@")[0];
  return "User";
}

export function UserAvatarMenu() {
  const { currentUser } = useRole();

  const initials = getInitials(currentUser?.firstName, currentUser?.lastName, currentUser?.email ?? undefined);
  const fullName = getFullName(currentUser?.firstName, currentUser?.lastName, currentUser?.email ?? undefined);
  const roleLabel = ROLE_LABELS[currentUser?.role || "employee"] || "User";
  const isAdmin = ADMIN_ROLES.includes(currentUser?.role || "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          data-testid="button-user-menu"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-white/30 hover:ring-white/60 transition-all">
            {currentUser?.profileImageUrl && (
              <AvatarImage src={currentUser.profileImageUrl} alt={fullName} />
            )}
            <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52" sideOffset={8}>
        {/* Identity header */}
        <DropdownMenuLabel className="py-2">
          <p className="font-semibold text-sm truncate">{fullName}</p>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">{roleLabel}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/delegations" className="flex items-center gap-2 cursor-pointer w-full" data-testid="menu-delegations">
            <Users className="w-4 h-4" />
            Delegations
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2 cursor-pointer w-full" data-testid="menu-admin-portal">
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href="/api/logout"
            className="flex items-center gap-2 cursor-pointer w-full text-destructive focus:text-destructive"
            data-testid="menu-sign-out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
