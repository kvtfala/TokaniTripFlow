import Papa from "papaparse";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
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
export async function exportToExcel(requests: TravelRequest[], filename: string): Promise<void> {
  const rows = requestsToExportRows(requests);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Travel Requests");

  if (rows.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
    return;
  }

  const keys = Object.keys(rows[0]) as (keyof ExportRow)[];

  const maxWidth = rows.reduce((w, r) => {
    return keys.reduce((w2, k) => {
      const val = r[k];
      const len = val !== undefined && val !== null ? val.toString().length : 10;
      w2[k] = Math.max(w2[k] || 10, len);
      return w2;
    }, w);
  }, {} as Record<string, number>);

  worksheet.columns = keys.map((k) => ({
    header: k,
    key: k,
    width: (maxWidth[k] || 10) + 2,
  }));

  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, filename);
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export to Xero Manual Journal import format (CSV)
 * Compatible with Xero > Accounting > Manual Journals > Import
 * Each travel request becomes one journal entry line (debit to travel expense account)
 */
export function exportToXeroCSV(requests: TravelRequest[], filename: string): void {
  const rows = requests.map((req) => {
    const totalCost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
    const dates = `${format(new Date(req.startDate), "dd/MM/yyyy")} - ${format(new Date(req.endDate), "dd/MM/yyyy")}`;
    const narration = `Travel: ${req.employeeName} to ${req.destination.city}, ${req.destination.country} (${dates})`;

    return {
      "*Narration": narration,
      "*AccountCode": "6200",
      "*TaxType": "BASEXCLUDED",
      "*Description": `${req.department} | ${req.costCentre.code} | Ref: ${req.id}`,
      "*Amount": totalCost.toFixed(2),
      "TrackingName1": "Cost Centre",
      "TrackingOption1": req.costCentre.code,
    };
  });

  const csv = Papa.unparse(rows);
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export to MYOB AccountRight import format (CSV)
 * Compatible with MYOB AccountRight > File > Import Data > General Journal Entries
 */
export function exportToMYOBCSV(requests: TravelRequest[], filename: string): void {
  const rows = requests.map((req) => {
    const totalCost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
    const approvedDate = req.reviewedAt
      ? format(new Date(req.reviewedAt), "dd/MM/yyyy")
      : format(new Date(req.submittedAt), "dd/MM/yyyy");

    return {
      "Date": approvedDate,
      "Memo": `Travel: ${req.employeeName} - ${req.destination.city}`,
      "Account Number": "6-2000",
      "Tax Code": "N-T",
      "Amount": totalCost.toFixed(2),
      "Job": req.costCentre.code,
      "Category": req.department,
      "Reference": req.id,
      "Employee": req.employeeName,
      "Destination": `${req.destination.city}, ${req.destination.country}`,
    };
  });

  const csv = Papa.unparse(rows);
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export as generic double-entry journal CSV
 * Each request produces two lines: one debit (travel expense) and one credit (AP or advance)
 * Works with most accounting systems that accept journal import
 */
export function exportToJournalCSV(requests: TravelRequest[], filename: string): void {
  const rows: object[] = [];

  requests.forEach((req) => {
    const totalCost = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
    const dateStr = req.reviewedAt
      ? format(new Date(req.reviewedAt), "yyyy-MM-dd")
      : format(new Date(req.submittedAt), "yyyy-MM-dd");
    const description = `Travel - ${req.employeeName} - ${req.destination.city}, ${req.destination.country} (${format(new Date(req.startDate), "dd/MM/yyyy")} - ${format(new Date(req.endDate), "dd/MM/yyyy")})`;
    const creditAccount = req.fundingType === "advance" ? "1120 Staff Travel Advances" : "2100 Accounts Payable";

    rows.push({
      "Date": dateStr,
      "Reference": req.id,
      "Description": description,
      "Account": "6200 Travel Expense",
      "Debit": totalCost.toFixed(2),
      "Credit": "",
      "Cost Centre": req.costCentre.code,
      "Department": req.department,
    });

    rows.push({
      "Date": dateStr,
      "Reference": req.id,
      "Description": description,
      "Account": creditAccount,
      "Debit": "",
      "Credit": totalCost.toFixed(2),
      "Cost Centre": req.costCentre.code,
      "Department": req.department,
    });
  });

  const csv = Papa.unparse(rows);
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface PDFSummaryFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
  costCentre?: string;
}

/**
 * Export a formatted PDF summary report
 * Suitable for printing or emailing to management/board
 */
export function exportToPDFSummary(
  requests: TravelRequest[],
  filters: PDFSummaryFilters,
  filename: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  const totalCost = requests.reduce(
    (sum, r) => sum + (r.costBreakdown?.totalCost || r.perDiem.totalFJD),
    0
  );

  const avgCost = requests.length > 0 ? totalCost / requests.length : 0;

  const depts = new Set(requests.map((r) => r.department)).size;
  const costCentres = new Set(requests.map((r) => r.costCentre.code)).size;

  const periodLabel = (() => {
    if (filters.startDate && filters.endDate) {
      return `${format(new Date(filters.startDate), "dd MMM yyyy")} to ${format(new Date(filters.endDate), "dd MMM yyyy")}`;
    }
    if (filters.startDate) return `From ${format(new Date(filters.startDate), "dd MMM yyyy")}`;
    if (filters.endDate) return `To ${format(new Date(filters.endDate), "dd MMM yyyy")}`;
    return "All periods";
  })();

  // === HEADER ===
  doc.setFillColor(17, 27, 63);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Tokani TripFlow", margin, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Travel Expense Summary Report", margin, 28);

  doc.setFontSize(9);
  doc.text(`Period: ${periodLabel}`, margin, 37);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageWidth - margin, 37, { align: "right" });

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // === APPLIED FILTERS ===
  const activeFilters: string[] = [];
  if (filters.department && filters.department !== "all") activeFilters.push(`Department: ${filters.department}`);
  if (filters.costCentre && filters.costCentre !== "all") activeFilters.push(`Cost Centre: ${filters.costCentre}`);

  if (activeFilters.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Filters applied: ${activeFilters.join(" | ")}`, margin, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);
  }

  // === KPI SUMMARY TABLE ===
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, yPos);
  yPos += 8;

  const kpiData = [
    ["Total Requests", requests.length.toString()],
    ["Total Spend (FJD)", `FJD ${totalCost.toLocaleString("en-FJ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ["Average Cost per Trip (FJD)", `FJD ${avgCost.toFixed(2)}`],
    ["Departments", depts.toString()],
    ["Cost Centres", costCentres.toString()],
  ];

  const kpiColWidths = [80, 80];
  const kpiRowHeight = 8;

  doc.setFontSize(9);
  kpiData.forEach(([label, value], i) => {
    const rowY = yPos + i * kpiRowHeight;
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, rowY - 5, kpiColWidths[0] + kpiColWidths[1], kpiRowHeight, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(label, margin + 2, rowY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(value, margin + kpiColWidths[0] + 2, rowY);
  });

  yPos += kpiData.length * kpiRowHeight + 14;

  // === TRANSACTION TABLE ===
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Transaction Detail", margin, yPos);
  yPos += 8;

  const colWidths = [28, 38, 28, 35, 18, 22];
  const colHeaders = ["Ref", "Employee", "Destination", "Dept / CC", "Days", "Total (FJD)"];
  const rowH = 7;

  doc.setFillColor(17, 27, 63);
  doc.rect(margin, yPos - 5, colWidths.reduce((a, b) => a + b, 0), rowH, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  let xPos = margin;
  colHeaders.forEach((h, i) => {
    doc.text(h, xPos + 2, yPos);
    xPos += colWidths[i];
  });

  yPos += rowH - 2;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);

  requests.forEach((req, idx) => {
    if (yPos > 265) {
      doc.addPage();
      yPos = 20;
      doc.setFillColor(17, 27, 63);
      doc.rect(margin, yPos - 5, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      let hx = margin;
      colHeaders.forEach((h, i) => {
        doc.text(h, hx + 2, yPos);
        hx += colWidths[i];
      });
      yPos += rowH - 2;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.5);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(margin, yPos - 5, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
    }

    const totalCostReq = req.costBreakdown?.totalCost || req.perDiem.totalFJD;
    const cells = [
      req.id.slice(0, 10),
      req.employeeName.slice(0, 18),
      `${req.destination.city}`.slice(0, 14),
      `${req.department.slice(0, 8)} / ${req.costCentre.code}`,
      req.perDiem.days.toString(),
      `FJD ${totalCostReq.toFixed(2)}`,
    ];

    let cx = margin;
    cells.forEach((cell, i) => {
      doc.text(cell, cx + 2, yPos);
      cx += colWidths[i];
    });

    yPos += rowH - 1;
  });

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Tokani TripFlow | Confidential | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(filename);
}

/**
 * Generate filename with filters and date
 */
export function generateExportFilename(
  fileFormat: "csv" | "xlsx" | "pdf",
  filters?: {
    startDate?: string;
    endDate?: string;
    department?: string;
    costCentre?: string;
  },
  prefix?: string
): string {
  const timestamp = format(new Date(), "yyyyMMdd");
  const base = prefix || "approvals";
  let name = `${base}_${timestamp}`;

  if (filters) {
    if (filters.department && filters.department !== "all") name += `_${filters.department.replace(/\s+/g, "_")}`;
    if (filters.costCentre && filters.costCentre !== "all") name += `_${filters.costCentre}`;
  }

  return `${name}.${fileFormat}`;
}
