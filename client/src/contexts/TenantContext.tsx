import { createContext, useContext, useEffect, ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";

export interface TenantConfig {
  companyCode: string;
  companyName: string;
  tagline: string;
  logoPath: string | null;
  primaryHSL: string;
  primaryForegroundHSL: string;
  accentHSL: string;
  accentColor: string;
  sidebarPrimaryHSL: string;
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
    accentColor: "#F5C800",
    sidebarPrimaryHSL: "49 92% 48%",
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
  root.style.setProperty("--accent-foreground", tenant.primaryForegroundHSL);
  root.style.setProperty("--secondary", tenant.accentHSL);
  root.style.setProperty("--secondary-foreground", tenant.primaryForegroundHSL);
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
