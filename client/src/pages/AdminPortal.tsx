import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Package, Mail, DollarSign, FileText, GitBranch, Bell, History } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Redirect } from "wouter";
import { VendorManagement } from "@/components/admin/VendorManagement";
import { EmailTemplateManagement } from "@/components/admin/EmailTemplateManagement";
import { PerDiemRatesManagement } from "@/components/admin/PerDiemRatesManagement";

export default function AdminPortal() {
  const { currentUser, isLoading } = useRole();
  const [activeTab, setActiveTab] = useState("vendors");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Only finance_admin and manager can access Admin Portal
  if (currentUser.role !== "finance_admin" && currentUser.role !== "manager") {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-admin-portal">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
        <p className="text-muted-foreground mt-2">
          Manage system configuration, content, and compliance settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2" data-testid="admin-tabs">
          <TabsTrigger value="vendors" className="gap-2" data-testid="tab-vendors">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Vendors</span>
          </TabsTrigger>
          <TabsTrigger value="email-templates" className="gap-2" data-testid="tab-email-templates">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="per-diem" className="gap-2" data-testid="tab-per-diem">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Per Diem</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2" data-testid="tab-policies">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Policies</span>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2" data-testid="tab-workflows">
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2" data-testid="tab-notifications">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2" data-testid="tab-audit">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Audit Log</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
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
              <p className="text-sm text-muted-foreground">Travel policy builder coming soon...</p>
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
              <p className="text-sm text-muted-foreground">Workflow rule configuration coming soon...</p>
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
              <p className="text-sm text-muted-foreground">Notification publisher coming soon...</p>
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
              <p className="text-sm text-muted-foreground">Audit log viewer coming soon...</p>
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
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">System settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
