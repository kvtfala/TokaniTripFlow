import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TravelRequestCard } from "@/components/TravelRequestCard";
import { ApprovalDialog } from "@/components/ApprovalDialog";
import { Plus, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { type TravelRequest } from "@shared/types";

// todo: remove mock functionality
const mockRequests: TravelRequest[] = [
  {
    id: "1",
    employeeName: "Jone Vakatawa",
    employeeId: "EMP001",
    destination: { code: "SYD", city: "Sydney", country: "Australia" },
    startDate: "2025-11-15",
    endDate: "2025-11-18",
    purpose: "Regional conference attendance",
    perDiem: { totalFJD: 325, days: 4, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 200, lastDayFJD: 50 },
    visaCheck: { status: "ACTION", message: "Visa required" },
    status: "pending",
    submittedAt: "2025-10-20T10:00:00Z",
  },
  {
    id: "2",
    employeeName: "Maria Santos",
    employeeId: "EMP002",
    destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
    startDate: "2025-10-25",
    endDate: "2025-10-27",
    purpose: "Training workshop",
    perDiem: { totalFJD: 225, days: 3, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 100, lastDayFJD: 50 },
    visaCheck: { status: "OK", message: "No visa required" },
    status: "approved",
    submittedAt: "2025-10-18T14:30:00Z",
    reviewedAt: "2025-10-19T09:15:00Z",
    reviewedBy: "Jane Manager",
  },
  {
    id: "3",
    employeeName: "Seru Rabuka",
    employeeId: "EMP003",
    destination: { code: "LAX", city: "Los Angeles", country: "United States" },
    startDate: "2025-12-01",
    endDate: "2025-12-05",
    purpose: "Industry expo participation",
    perDiem: { totalFJD: 425, days: 5, mieFJD: 100, firstDayFJD: 75, middleDaysFJD: 300, lastDayFJD: 50 },
    visaCheck: { status: "WARNING", message: "ESTA required" },
    status: "rejected",
    submittedAt: "2025-10-15T11:00:00Z",
    reviewedAt: "2025-10-16T16:45:00Z",
    reviewedBy: "John Supervisor",
    reviewComment: "Budget constraints for Q4",
  },
];

export default function Dashboard() {
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = (request: TravelRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const stats = {
    total: mockRequests.length,
    pending: mockRequests.filter(r => r.status === "pending").length,
    approved: mockRequests.filter(r => r.status === "approved").length,
    rejected: mockRequests.filter(r => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Travel Requests</h1>
          <p className="text-muted-foreground mt-1">Manage and track all travel requests</p>
        </div>
        <Link href="/request/new">
          <Button className="gap-2 h-12" data-testid="button-new-request">
            <Plus className="w-5 h-5" />
            New Request
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Requests</p>
                <p className="text-3xl font-bold" data-testid="text-stat-total">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold" data-testid="text-stat-pending">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Approved</p>
                <p className="text-3xl font-bold" data-testid="text-stat-approved">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Rejected</p>
                <p className="text-3xl font-bold" data-testid="text-stat-rejected">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockRequests.map((request) => (
              <TravelRequestCard
                key={request.id}
                request={request}
                onClick={() => handleCardClick(request)}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockRequests.filter(r => r.status === "pending").map((request) => (
              <TravelRequestCard
                key={request.id}
                request={request}
                onClick={() => handleCardClick(request)}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockRequests.filter(r => r.status === "approved").map((request) => (
              <TravelRequestCard
                key={request.id}
                request={request}
                onClick={() => handleCardClick(request)}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockRequests.filter(r => r.status === "rejected").map((request) => (
              <TravelRequestCard
                key={request.id}
                request={request}
                onClick={() => handleCardClick(request)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApprove={(id) => {
          console.log("Approved:", id);
          setDialogOpen(false);
        }}
        onReject={(id, comment) => {
          console.log("Rejected:", id, comment);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
