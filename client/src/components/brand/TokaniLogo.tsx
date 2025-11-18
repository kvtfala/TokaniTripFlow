import { cn } from "@/lib/utils";

interface TokaniLogoProps {
  variant?: "full" | "icon" | "text";
  className?: string;
  "data-testid"?: string;
}

export function TokaniLogo({ variant = "full", className, "data-testid": dataTestId }: TokaniLogoProps) {
  const logoUrl = "/tokani-logo.svg";
  
  if (variant === "icon") {
    return (
      <img
        src={logoUrl}
        alt="Tokani TripFlow"
        className={cn("rounded-full object-cover", className)}
        data-testid={dataTestId || "img-logo-icon"}
      />
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("flex flex-col", className)} data-testid={dataTestId || "logo-text"}>
        <span className="font-bold text-xl tracking-tight">TOKANI</span>
        <span className="text-sm font-medium opacity-90">TRIP FLOW</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)} data-testid={dataTestId || "logo-full"}>
      <img
        src={logoUrl}
        alt="Tokani TripFlow"
        className="h-12 w-12 rounded-full shadow-md object-cover"
        data-testid="img-logo"
      />
      <div className="flex flex-col">
        <span className="font-bold text-xl tracking-tight">TOKANI</span>
        <span className="text-sm font-medium opacity-90">TRIP FLOW</span>
      </div>
    </div>
  );
}
