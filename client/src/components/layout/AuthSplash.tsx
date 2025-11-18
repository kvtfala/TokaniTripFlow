import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AuthSplashProps {
  onComplete: () => void;
  minDuration?: number;
}

export function AuthSplash({ onComplete, minDuration = 2000 }: AuthSplashProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const logoUrl = "/tokani-logo.png";

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500); // Wait for fade-out animation
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        "bg-gradient-to-br from-dusk-navy via-primary to-secondary",
        "transition-opacity duration-500",
        fadeOut ? "opacity-0" : "opacity-100"
      )}
      data-testid="splash-screen"
    >
      {/* Animated logo */}
      <div className="relative">
        {/* Pulsing glow effect */}
        <div className="absolute inset-0 animate-pulse">
          <div className="h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        </div>
        
        {/* Logo with scale animation */}
        <img
          src={logoUrl}
          alt="Tokani TripFlow"
          className="h-32 w-32 rounded-full shadow-2xl relative z-10 animate-scale-in"
          data-testid="splash-logo"
        />
      </div>

      {/* Text content */}
      <div className="mt-8 text-center animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-2">
          TOKANI TRIP FLOW
        </h1>
        <p className="text-white/80 text-sm">
          Preparing your travel overview...
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-6 animate-fade-in">
        <div className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:0ms]" />
        <div className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:150ms]" />
        <div className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
      </div>

      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.8s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
}
