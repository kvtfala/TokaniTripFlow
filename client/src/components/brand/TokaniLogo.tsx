import { cn } from "@/lib/utils";

interface TokaniLogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export function TokaniLogo({ variant = "full", className }: TokaniLogoProps) {
  const logoUrl = "/tokani-logo.png";
  
  if (variant === "icon") {
    return (
      <img
        src={logoUrl}
        alt="Tokani TripFlow"
        className={cn("rounded-full", className)}
        data-testid="img-logo"
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoUrl}
        alt="Tokani TripFlow"
        className="h-12 w-12 rounded-full shadow-md"
        data-testid="img-logo"
      />
      <div className="flex flex-col">
        <span className="font-bold text-xl tracking-tight">TOKANI</span>
        <span className="text-sm font-medium opacity-90">TRIP FLOW</span>
      </div>
    </div>
  );
}
