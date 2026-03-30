import { createContext, useContext, useEffect, ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";

export interface TenantConfig {
  companyCode: string;
  companyName: string;
  tagline: string;
  logoPath: string | null;
  /** CSS HSL value for primary CTA buttons / header background */
  primaryHSL: string;
  /** Text colour on top of primaryHSL — dark for yellow, white for blue */
  primaryForegroundHSL: string;
  /** CSS HSL value for secondary/accent highlights (badges, tags, accents) */
  accentHSL: string;
  /** Text colour on top of accentHSL — must have sufficient contrast */
  accentForegroundHSL: string;
  /** Hex colour used for icon accent strokes (TokaniIcons accentColor prop) */
  accentColor: string;
  /** CSS HSL for active sidebar item background */
  sidebarPrimaryHSL: string;
  /** Text colour on top of the active sidebar item background */
  sidebarPrimaryForegroundHSL: string;
}

const CSS_VARS = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--secondary",
  "--secondary-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--ring",
] as const;

const TENANT_CONFIGS: Record<string, TenantConfig> = {
  itt001: {
    companyCode: "itt001",
    companyName: "Tokani TripFlow",
    tagline: "Your Trusted Partner for Travel Approvals",
    logoPath: null,
    primaryHSL: "211 72% 48%",
    primaryForegroundHSL: "0 0% 100%",
    accentHSL: "189 75% 48%",
    accentForegroundHSL: "0 0% 100%",
    accentColor: "#1FBED6",
    sidebarPrimaryHSL: "211 72% 48%",
    sidebarPrimaryForegroundHSL: "0 0% 100%",
  },
  cdp001: {
    companyCode: "cdp001",
    companyName: "CDP Couriers",
    tagline: "Travel Approval System",
    logoPath: "/logos/cdp-logo.png",
    primaryHSL: "49 92% 48%",
    primaryForegroundHSL: "22 68% 16%",
    accentHSL: "22 68% 21%",
    // White on dark brown — ensures text is readable on secondary/accent badges
    accentForegroundHSL: "0 0% 100%",
    accentColor: "#F5C800",
    sidebarPrimaryHSL: "49 92% 48%",
    // Dark brown on yellow active sidebar item — readable
    sidebarPrimaryForegroundHSL: "22 68% 16%",
  },
};

const DEFAULT_TENANT = TENANT_CONFIGS["itt001"];

const TenantContext = createContext<TenantConfig>(DEFAULT_TENANT);

function clearTenantOverrides() {
  const root = document.documentElement;
  CSS_VARS.forEach((v) => root.style.removeProperty(v));
}

function applyTenantLight(tenant: TenantConfig) {
  const root = document.documentElement;
  root.style.setProperty("--primary", tenant.primaryHSL);
  root.style.setProperty("--primary-foreground", tenant.primaryForegroundHSL);
  root.style.setProperty("--accent", tenant.accentHSL);
  root.style.setProperty("--accent-foreground", tenant.accentForegroundHSL);
  root.style.setProperty("--secondary", tenant.accentHSL);
  root.style.setProperty("--secondary-foreground", tenant.accentForegroundHSL);
  root.style.setProperty("--sidebar-primary", tenant.sidebarPrimaryHSL);
  root.style.setProperty("--sidebar-primary-foreground", tenant.sidebarPrimaryForegroundHSL);
  root.style.setProperty("--ring", tenant.primaryHSL);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useRole();
  const companyCode = currentUser?.companyCode ?? "itt001";
  const tenant = TENANT_CONFIGS[companyCode] ?? DEFAULT_TENANT;

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        clearTenantOverrides();
      } else {
        applyTenantLight(tenant);
      }
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      clearTenantOverrides();
    };
  }, [companyCode, tenant]);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}
