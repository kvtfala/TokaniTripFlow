import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { TravelRequest } from "@shared/types";
import { format } from "date-fns";

export interface ExportRow {
  RequestID: string;
  Employee: string;
  EmployeeNumber: string;
  Department: string;
  CostCentre: string;
  CostCentreName: string;
  Status: string;
  Destination: string;
  StartDate: string;
  EndDate: string;
  Days: number;
  FlightsFJD: number | string;
  AccommodationFJD: number | string;
  GroundTransfersFJD: number | string;
  VisaFeesFJD: number | string;
  PerDiemFJD: number;
  TotalCostFJD: number;
  FundingType: string;
  SubmittedOn: string;
  ApprovedOn: string;
}

/**
 * Convert travel requests to export rows
 */
export function requestsToExportRows(requests: TravelRequest[]): ExportRow[] {
  return requests.map((req) => ({
    RequestID: req.id,
    Employee: req.employeeName,
    EmployeeNumber: req.employeeNumber,
    Department: req.department,
    CostCentre: req.costCentre.code,
    CostCentreName: req.costCentre.name,
    Status: req.status.toUpperCase(),
    Destination: `${req.destination.city}, ${req.destination.country}`,
    StartDate: format(new Date(req.startDate), "yyyy-MM-dd"),
    EndDate: format(new Date(req.endDate), "yyyy-MM-dd"),
    Days: req.perDiem.days,
    FlightsFJD: req.costBreakdown?.flights || "-",
    AccommodationFJD: req.costBreakdown?.accommodation || "-",
    GroundTransfersFJD: req.costBreakdown?.groundTransfers || "-",
    VisaFeesFJD: req.costBreakdown?.visaFees || "-",
    PerDiemFJD: req.costBreakdown?.perDiem || req.perDiem.totalFJD,
    TotalCostFJD: req.costBreakdown?.totalCost || req.perDiem.totalFJD,
    FundingType: req.fundingType.charAt(0).toUpperCase() + req.fundingType.slice(1),
    SubmittedOn: format(new Date(req.submittedAt), "yyyy-MM-dd HH:mm"),
    ApprovedOn: req.reviewedAt ? format(new Date(req.reviewedAt), "yyyy-MM-dd HH:mm") : "",
  }));
}

/**
 * Export to CSV with UTF-8 BOM
 */
export function exportToCSV(requests: TravelRequest[], filename: string): void {
  const rows = requestsToExportRows(requests);
  const csv = Papa.unparse(rows);

  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export to Excel (XLSX)
 */
export function exportToExcel(requests: TravelRequest[], filename: string): void {
  const rows = requestsToExportRows(requests);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Travel Requests");

  // Auto-size columns
  const maxWidth = rows.reduce((w, r) => {
    return Object.keys(r).reduce((w2, k) => {
      const val = (r as any)[k];
      const len = val ? val.toString().length : 10;
      w2[k] = Math.max(w2[k] || 10, len);
      return w2;
    }, w);
  }, {} as Record<string, number>);

  worksheet["!cols"] = Object.keys(maxWidth).map((k) => ({ wch: maxWidth[k] + 2 }));

  XLSX.writeFile(workbook, filename);
}

/**
 * Generate filename with filters and date
 */
export function generateExportFilename(
  fileFormat: "csv" | "xlsx",
  filters?: {
    startDate?: string;
    endDate?: string;
    department?: string;
    costCentre?: string;
  }
): string {
  const timestamp = format(new Date(), "yyyyMMdd");
  let name = `approvals_${timestamp}`;

  if (filters) {
    if (filters.department) name += `_${filters.department.replace(/\s+/g, "_")}`;
    if (filters.costCentre) name += `_${filters.costCentre}`;
  }

  return `${name}.${fileFormat}`;
}
