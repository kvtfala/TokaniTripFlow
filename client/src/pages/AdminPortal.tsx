import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Package, Mail, DollarSign, FileText, GitBranch, Bell, History, Users } from "lucide-react";
import { IconSettings } from "@/components/icons/TokaniIcons";
import { useRole } from "@/contexts/RoleContext";
import { Redirect } from "wouter";
import { VendorManagement } from "@/components/admin/VendorManagement";
import { EmailTemplateManagement } from "@/components/admin/EmailTemplateManagement";
import { PerDiemRatesManagement } from "@/components/admin/PerDiemRatesManagement";
import { SystemNotificationsManagement } from "@/components/admin/SystemNotificationsManagement";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { TravelPoliciesManagement } from "@/components/admin/TravelPoliciesManagement";
import { WorkflowRulesManagement } from "@/components/admin/WorkflowRulesManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { AdminSettings } from "@/components/admin/AdminSettings";
import type { UserRole } from "@shared/schema";

// Tab visibility: which roles can see each tab
const TAB_ROLES: Record<string, UserRole[]> = {
  vendors:        ["finance_admin", "travel_admin", "super_admin"],
  "email-templates": ["travel_admin", "super_admin"],
  "per-diem":     ["finance_admin", "super_admin"],
  policies:       ["finance_admin", "super_admin"],
  workflows:      ["travel_admin", "super_admin"],
  notifications:  ["finance_admin", "travel_admin", "super_admin"],
  audit:          ["finance_admin", "super_admin"],
  users:          ["super_admin"],
  settings:       ["super_admin"],
};

function canSeeTab(role: string, tab: string): boolean {
  const allowed = TAB_ROLES[tab];
  if (!allowed) return false;
  return allowed.includes(role as UserRole);
}

export default function AdminPortal() {
  const { currentUser, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Access guard: finance_admin, travel_admin, super_admin only (manager excluded)
  const role = currentUser?.role ?? "";
  const hasAccess = role === "finance_admin" || role === "travel_admin" || role === "super_admin";

  if (!hasAccess) {
    return <Redirect to="/" />;
  }

  // Derive the first visible tab for this role as the default
  const firstVisible = Object.keys(TAB_ROLES).find(tab => canSeeTab(role, tab)) ?? "vendors";

  return (
    <AdminPortalContent role={role} firstVisible={firstVisible} />
  );
}

function AdminPortalContent({ role, firstVisible }: { role: string; firstVisible: string }) {
  const [activeTab, setActiveTab] = useState(firstVisible);

  const visibleTabs = Object.keys(TAB_ROLES).filter(tab => canSeeTab(role, tab));
  const colCount = Math.min(visibleTabs.length, 9);

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-admin-portal">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <IconSettings size={36} accentColor="#1FBED6" />
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-admin-portal">Admin Portal</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Manage system configuration, content, and compliance settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList
          className={`grid w-full gap-2`}
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
          data-testid="admin-tabs"
        >
          {canSeeTab(role, "vendors") && (
            <TabsTrigger value="vendors" className="gap-2" data-testid="tab-vendors">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Vendors</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "email-templates") && (
            <TabsTrigger value="email-templates" className="gap-2" data-testid="tab-email-templates">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "per-diem") && (
            <TabsTrigger value="per-diem" className="gap-2" data-testid="tab-per-diem">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Per Diem</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "policies") && (
            <TabsTrigger value="policies" className="gap-2" data-testid="tab-policies">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "workflows") && (
            <TabsTrigger value="workflows" className="gap-2" data-testid="tab-workflows">
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Workflows</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "notifications") && (
            <TabsTrigger value="notifications" className="gap-2" data-testid="tab-notifications">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "audit") && (
            <TabsTrigger value="audit" className="gap-2" data-testid="tab-audit">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Audit Log</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "users") && (
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          )}
          {canSeeTab(role, "settings") && (
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Vendor Management
              </CardTitle>
              <CardDescription>
                Manage travel service vendors, approval workflow, and performance ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendorManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Configure email templates with dynamic placeholders for automated notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailTemplateManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="per-diem" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Per Diem Rates
              </CardTitle>
              <CardDescription>
                Configure location-based daily allowance rates with effective date ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerDiemRatesManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Travel Policies
              </CardTitle>
              <CardDescription>
                Define policy rules with conditions, actions, and compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TravelPoliciesManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Workflow Rules
              </CardTitle>
              <CardDescription>
                Configure multi-stage approval workflows with role-based routing and escalation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowRulesManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                System Notifications
              </CardTitle>
              <CardDescription>
                Publish system-wide notifications with targeting, severity levels, and expiry dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemNotificationsManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Audit Log
              </CardTitle>
              <CardDescription>
                View comprehensive audit trail with before/after snapshots and change history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage staff accounts, assign roles, and control access. Role changes take effect on next login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure your organisation profile and manage cost centres used across the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
