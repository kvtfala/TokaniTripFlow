import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  PlaneTakeoff, 
  CheckSquare, 
  History, 
  FileSpreadsheet, 
  BarChart3, 
  UserCog,
  Menu,
  Map
} from "lucide-react";
import logoUrl from "@assets/Red and Blue Logo for Tokani Trip Flow_1761166715410.png";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import NewRequest from "@/pages/NewRequest";
import Approvals from "@/pages/Approvals";
import MyTrips from "@/pages/MyTrips";
import FinanceExport from "@/pages/FinanceExport";
import Analytics from "@/pages/Analytics";
import DelegateSettings from "@/pages/DelegateSettings";
import TravelWatch from "@/pages/TravelWatch";

const menuItems = [
  {
    title: "Dashboard",
    subtitle: "Analytics",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "New Request",
    url: "/request/new",
    icon: PlaneTakeoff,
  },
  {
    title: "My Trips",
    subtitle: "Personal",
    url: "/my-trips",
    icon: History,
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: CheckSquare,
  },
  {
    title: "Finance Export",
    url: "/finance",
    icon: FileSpreadsheet,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Travel Watch",
    subtitle: "Live Tracking",
    url: "/travel-watch",
    icon: Map,
  },
  {
    title: "Delegations",
    url: "/delegations",
    icon: UserCog,
  },
];

function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function Router() {
  const style = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-50 bg-primary text-white">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <img src={logoUrl} alt="Tokani TripFlow Logo" className="h-12 w-12 rounded-full" data-testid="img-logo" />
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold">Tokani TripFlow</h1>
                <span className="text-sm text-white/90">Your Trusted Partner for Travel Approvals</span>
              </div>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/request/new" component={NewRequest} />
              <Route path="/approvals" component={Approvals} />
              <Route path="/my-trips" component={MyTrips} />
              <Route path="/finance" component={FinanceExport} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/travel-watch" component={TravelWatch} />
              <Route path="/delegations" component={DelegateSettings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
