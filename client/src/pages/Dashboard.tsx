import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApprovalDialog } from "@/components/ApprovalDialog";
import { Plus, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { type TravelRequest } from "@shared/types";
import { format } from "date-fns";

export default function Dashboard() {
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  const handleRowClick = (request: TravelRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "submitted" || r.status === "in_review").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  const getStatusBadge = (status: TravelRequest['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'in_review':
        return <Badge variant="secondary">In Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTable = (filteredRequests: TravelRequest[]) => {
    if (filteredRequests.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No travel requests found
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Travel Dates</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Per Diem</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleRowClick(request)}
                    data-testid={`row-request-${request.id}`}
                  >
                    <TableCell className="font-medium">{request.employeeName}</TableCell>
                    <TableCell>
                      {request.destination.city}, {request.destination.country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(request.startDate), 'dd MMM')} – {format(new Date(request.endDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      FJD {request.perDiem.totalFJD.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.submittedAt), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
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
          {renderTable(requests)}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {renderTable(requests.filter(r => r.status === "submitted" || r.status === "in_review"))}
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          {renderTable(requests.filter(r => r.status === "approved"))}
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          {renderTable(requests.filter(r => r.status === "rejected"))}
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
