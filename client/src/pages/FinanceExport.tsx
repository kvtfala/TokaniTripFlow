import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet } from "lucide-react";
import type { TravelRequest, CostCentre } from "@shared/types";
import { CostCentreAdapter } from "@/data/adapters/CostCentreAdapter";
import { exportToCSV, exportToExcel, generateExportFilename } from "@/utils/export";
import { useEffect } from "react";

export default function FinanceExport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);

  const { data: allRequests = [] } = useQuery<TravelRequest[]>({
    queryKey: ["/api/requests"],
  });

  useEffect(() => {
    CostCentreAdapter.list().then(setCostCentres);
  }, []);

  const filteredRequests = allRequests.filter((req) => {
    // Only approved requests for finance export
    if (req.status !== "approved") return false;

    if (startDate && req.submittedAt < startDate) return false;
    if (endDate && req.submittedAt > endDate) return false;
    if (department && department !== "all" && req.department !== department) return false;
    if (costCentre && costCentre !== "all" && req.costCentre.code !== costCentre) return false;

    return true;
  });

  const handleExportCSV = () => {
    const filename = generateExportFilename("csv", {
      startDate,
      endDate,
      department,
      costCentre,
    });
    exportToCSV(filteredRequests, filename);
  };

  const handleExportExcel = () => {
    const filename = generateExportFilename("xlsx", {
      startDate,
      endDate,
      department,
      costCentre,
    });
    exportToExcel(filteredRequests, filename);
  };

  const totalPerDiem = filteredRequests.reduce(
    (sum, req) => sum + req.perDiem.totalFJD,
    0
  );

  const departments = Array.from(
    new Set(allRequests.map((r) => r.department))
  ).sort();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Finance Export</h1>
        <p className="text-muted-foreground">
          Export approved travel requests for finance reconciliation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine your export criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                  data-testid="input-start-date"
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                  data-testid="input-end-date"
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="mt-2" data-testid="select-department">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="costCentre">Cost Centre</Label>
                <Select value={costCentre} onValueChange={setCostCentre}>
                  <SelectTrigger className="mt-2" data-testid="select-cost-centre">
                    <SelectValue placeholder="All cost centres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cost centres</SelectItem>
                    {costCentres.map((cc) => (
                      <SelectItem key={cc.code} value={cc.code}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setDepartment("all");
                  setCostCentre("all");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">
                  Filtered Requests
                </div>
                <div className="text-3xl font-bold">
                  {filteredRequests.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">
                  Total Per Diem
                </div>
                <div className="text-3xl font-bold text-primary">
                  FJD {totalPerDiem.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">
                  Cost Centres
                </div>
                <div className="text-3xl font-bold">
                  {
                    new Set(filteredRequests.map((r) => r.costCentre.code))
                      .size
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Download filtered data in your preferred format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  className="gap-2"
                  onClick={handleExportCSV}
                  disabled={filteredRequests.length === 0}
                  data-testid="button-export-csv"
                >
                  <FileDown className="w-4 h-4" />
                  Export as CSV
                </Button>

                <Button
                  className="gap-2"
                  onClick={handleExportExcel}
                  disabled={filteredRequests.length === 0}
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export as Excel
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg text-sm">
                <h4 className="font-semibold mb-2">Export Columns:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Request ID, Employee, Employee Number</li>
                  <li>Department, Cost Centre, Cost Centre Name</li>
                  <li>Status, Destination</li>
                  <li>Start Date, End Date, Days</li>
                  <li>Total Per Diem (FJD), Funding Type</li>
                  <li>Submitted On, Approved On</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Sample of filtered requests ({Math.min(5, filteredRequests.length)} of{" "}
                {filteredRequests.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No approved requests match the selected filters
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{req.employeeName}</div>
                        <div className="text-sm text-muted-foreground">
                          {req.destination.city} • {req.costCentre.code}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">
                          FJD {req.perDiem.totalFJD.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {req.fundingType}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredRequests.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      ... and {filteredRequests.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
