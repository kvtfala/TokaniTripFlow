import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleProvider } from "@/contexts/RoleContext";
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
  IconDashboard,
  IconFlights,
  IconApprovals,
  IconTrips,
  IconExpense,
  IconReports,
  IconDutyOfCare,
  IconTravellers,
  IconSettings,
  type TokaniIconProps,
} from "@/components/icons/TokaniIcons";
import { TokaniLogo } from "@/components/brand/TokaniLogo";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import NewRequest from "@/pages/NewRequest";
import Approvals from "@/pages/Approvals";
import MyTrips from "@/pages/MyTrips";
import Reports from "@/pages/Reports";
import DelegateSettings from "@/pages/DelegateSettings";
import TravelWatch from "@/pages/TravelWatch";
import CoordinatorDashboard from "@/pages/CoordinatorDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import RequestDetail from "@/pages/RequestDetail";
import TravelDeskDashboard from "@/pages/TravelDeskDashboard";
import LandingPage from "@/pages/LandingPage";
import AdminPortal from "@/pages/AdminPortal";
import TokenApproval from "@/pages/TokenApproval";
import ExpenseClaims from "@/pages/ExpenseClaims";
import { useAuth } from "@/hooks/useAuth";
import { AuthSplash } from "@/components/layout/AuthSplash";
import { useState, useEffect } from "react";

const menuItems: { title: string; subtitle?: string; url: string; icon: React.FC<TokaniIconProps> }[] = [
  {
    title: "Home",
    subtitle: "Overview",
    url: "/",
    icon: IconDashboard,
  },
  {
    title: "New Request",
    url: "/request/new",
    icon: IconFlights,
  },
  {
    title: "My Requests",
    subtitle: "Personal",
    url: "/my-trips",
    icon: IconTrips,
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: IconApprovals,
  },
  {
    title: "Expenses",
    subtitle: "Claims & Receipts",
    url: "/expenses",
    icon: IconExpense,
  },
  {
    title: "Reports",
    subtitle: "Analytics & Export",
    url: "/reports",
    icon: IconReports,
  },
  {
    title: "Travel Watch",
    subtitle: "Live Tracking",
    url: "/travel-watch",
    icon: IconDutyOfCare,
  },
  {
    title: "Delegations",
    url: "/delegations",
    icon: IconTravellers,
  },
  {
    title: "Admin Portal",
    subtitle: "System Config",
    url: "/admin",
    icon: IconSettings,
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
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon
                          size={20}
                          accentColor="#1FBED6"
                          className={isActive ? "" : "opacity-60"}
                        />
                        <div className="flex flex-col">
                          <span>{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function Router() {
  // Replit Auth Integration - Show Landing page for logged-out users
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);

  const style = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show splash after successful authentication
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setShowSplash(true);
    } else if (!isAuthenticated) {
      // Reset splash when logged out, so it shows again on next login
      setShowSplash(false);
    }
  }, [isLoading, isAuthenticated]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show landing page if not authenticated or still loading auth
  // (Token approval page is always public — no login required)
  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/approve/:token" component={TokenApproval} />
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // Show splash screen after successful auth
  if (showSplash) {
    return <AuthSplash onComplete={handleSplashComplete} />;
  }

  // Show authenticated app
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-50 bg-primary text-primary-foreground shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="text-primary-foreground" />
              <TokaniLogo variant="icon" className="h-14 w-14 flex-shrink-0" />
              <Badge variant="outline" className="border-white/50 text-white bg-white/10 text-xs font-semibold px-2 py-0.5" data-testid="badge-demo">
                DEMO
              </Badge>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-semibold whitespace-nowrap">Bula! Tokani TripFlow</h1>
                <span className="text-xs opacity-90 whitespace-nowrap hidden sm:block">Your Trusted Partner for Travel Approvals</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="/api/logout">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10" data-testid="button-logout">
                  Sign Out
                </Button>
              </a>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/dashboard/coordinator" component={CoordinatorDashboard} />
              <Route path="/dashboard/manager" component={ManagerDashboard} />
              <Route path="/dashboard/travel-desk" component={TravelDeskDashboard} />
              <Route path="/request/new" component={NewRequest} />
              <Route path="/requests/:id" component={RequestDetail} />
              <Route path="/approvals" component={Approvals} />
              <Route path="/my-trips" component={MyTrips} />
              <Route path="/expenses" component={ExpenseClaims} />
              <Route path="/reports" component={Reports} />
              <Route path="/travel-watch" component={TravelWatch} />
              <Route path="/delegations" component={DelegateSettings} />
              <Route path="/admin" component={AdminPortal} />
              <Route path="/approve/:token" component={TokenApproval} />
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
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </RoleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
