/**
 * server/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the development PostgreSQL database with the same operational demo data
 * that MemStorage provides at boot time.
 *
 * SAFE TO RE-RUN: each entity is inserted with ON CONFLICT DO NOTHING (or an
 * explicit existence check), so running this script multiple times will not
 * create duplicates or change existing rows.
 *
 * Run with:  npx tsx server/seed.ts
 */

import { db } from "./db";
import {
  travelRequests,
  travelQuotes,
  expenseClaims,
  delegateAssignments,
  quotePolicies,
  refSequences,
} from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
import { randomUUID } from "crypto";

// ── Helpers ───────────────────────────────────────────────────────────────────

function d(iso: string): Date { return new Date(iso); }

function travelRequestRow(req: any, companyCode: string) {
  return {
    id: req.id,
    ttrNumber: req.ttrNumber,
    companyCode,
    employeeId: req.employeeId,
    employeeName: req.employeeName,
    employeeNumber: req.employeeNumber,
    position: req.position,
    department: req.department,
    startDate: req.startDate,
    endDate: req.endDate,
    purpose: req.purpose,
    status: req.status,
    fundingType: req.fundingType ?? "advance",
    approverFlow: req.approverFlow ?? [],
    approverIndex: req.approverIndex ?? 0,
    submittedAt: req.submittedAt ? d(req.submittedAt) : null,
    reviewedAt: req.reviewedAt ? d(req.reviewedAt) : null,
    reviewedBy: req.reviewedBy ?? null,
    reviewComment: req.reviewComment ?? null,
    auditFlag: req.auditFlag ?? false,
    auditNote: req.auditNote ?? null,
    needsFlights: req.needsFlights ?? false,
    needsAccommodation: req.needsAccommodation ?? false,
    needsVisa: req.needsVisa ?? false,
    needsTransport: req.needsTransport ?? false,
    totalEstimatedBudget: req.totalEstimatedBudget?.toString() ?? null,
    preferredRoute: req.preferredRoute ?? null,
    travelMode: req.travelMode ?? null,
    suggestedModes: req.suggestedModes ?? null,
    selectedQuoteId: req.selectedQuoteId ?? null,
    quoteJustification: req.quoteJustification ?? null,
    quoteRequirementOverridden: req.quoteRequirementOverridden ?? false,
    quoteOverrideReason: req.quoteOverrideReason ?? null,
    approvalToken: req.approvalToken ?? null,
    approvalTokenExpiry: req.approvalTokenExpiry ?? null,
    emergencyContactName: req.emergencyContactName ?? null,
    emergencyContactPhone: req.emergencyContactPhone ?? null,
    countryRiskLevel: req.countryRiskLevel ?? null,
    destination: req.destination,
    costCentre: req.costCentre,
    perDiem: req.perDiem,
    visaCheck: req.visaCheck,
    costBreakdown: req.costBreakdown ?? null,
    rfqRecipients: req.rfqRecipients ?? null,
    history: req.history ?? [],
    createdAt: new Date("2025-10-01T00:00:00Z"),
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  };
}

// ── ITT Travel Requests ───────────────────────────────────────────────────────

const ittRequests = [
  {
    id: "req-001", ttrNumber: "TTR-2026-00001",
    employeeName: "Ratu Epeli Cakobau", employeeNumber: "ITT-BOD-001",
    position: "Chairman & CEO", department: "Board of Directors", employeeId: "employee",
    destination: { code: "SYD", city: "Sydney", country: "Australia" },
    startDate: "2026-03-05", endDate: "2026-03-12",
    emergencyContactName: "Lady Mere Cakobau", emergencyContactPhone: "+679 923 4567",
    countryRiskLevel: "low",
    purpose: "Island Travel Technologies annual strategic planning retreat with regional subsidiary directors",
    perDiem: { totalFJD: 2900, days: 6, mieFJD: 495, firstDayFJD: 371.25, middleDaysFJD: 1980, lastDayFJD: 371.25 },
    visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
    status: "approved", submittedAt: "2025-10-15T10:30:00Z",
    costCentre: { code: "100-BOD", name: "Board of Directors" }, fundingType: "advance",
    approverFlow: ["finance_admin"], approverIndex: 1,
    history: [
      { ts: "2025-10-15T10:30:00Z", actor: "employee", action: "SUBMIT", note: "Annual executive retreat - CEO office" },
      { ts: "2025-10-16T09:15:00Z", actor: "finance_admin", action: "APPROVE", note: "Board-level travel approved" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
    costBreakdown: { flights: 2500, accommodation: 2400, groundTransfers: 180, visaFees: 250, perDiem: 2900, totalCost: 8230 },
  },
  {
    id: "req-002", ttrNumber: "TTR-2026-00002",
    employeeName: "Litiana Ravouvou", employeeNumber: "ITT-EXE-012",
    position: "Chief Operating Officer", department: "Executive Management", employeeId: "employee",
    destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
    startDate: "2026-03-06", endDate: "2026-03-10", countryRiskLevel: "low",
    purpose: "ITT subsidiary acquisition due diligence and regional expansion planning with NZ partners",
    perDiem: { totalFJD: 2300, days: 5, mieFJD: 470, firstDayFJD: 352.5, middleDaysFJD: 1410, lastDayFJD: 352.5 },
    visaCheck: { status: "OK", message: "No visa required for New Zealand citizens visiting NZ." },
    status: "approved", submittedAt: "2025-10-12T11:00:00Z",
    costCentre: { code: "200-EXE", name: "Executive Management" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 2,
    history: [
      { ts: "2025-10-12T11:00:00Z", actor: "employee", action: "SUBMIT", note: "Critical M&A due diligence - COO" },
      { ts: "2025-10-13T10:30:00Z", actor: "manager", action: "APPROVE", note: "Executive-level strategic initiative approved" },
      { ts: "2025-10-13T15:45:00Z", actor: "finance_admin", action: "APPROVE", note: "High-value travel approved" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    costBreakdown: { flights: 1800, accommodation: 1750, groundTransfers: 140, perDiem: 2300, totalCost: 5990 },
  },
  {
    id: "req-003", ttrNumber: "TTR-2026-00003",
    employeeName: "Jone Navuso", employeeNumber: "ITT-TRV-047",
    position: "Travel Booking Specialist", department: "Travel Operations", employeeId: "employee",
    destination: { code: "NAN", city: "Nadi", country: "Fiji" },
    startDate: "2026-03-16", endDate: "2026-03-19",
    emergencyContactName: "Ana Navuso", emergencyContactPhone: "+679 934 5678", countryRiskLevel: "low",
    purpose: "Corporate travel vendor negotiations and annual contract renewals at Nadi Airport hub",
    perDiem: { totalFJD: 1250, days: 4, mieFJD: 320, firstDayFJD: 240, middleDaysFJD: 640, lastDayFJD: 240 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
    status: "approved", submittedAt: "2025-10-10T09:00:00Z",
    costCentre: { code: "300-TRV", name: "Travel Operations" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 2,
    history: [
      { ts: "2025-10-10T09:00:00Z", actor: "employee", action: "SUBMIT", note: "Vendor contract renewal meetings scheduled" },
      { ts: "2025-10-10T13:20:00Z", actor: "manager", action: "APPROVE", note: "Annual procurement cycle approved" },
      { ts: "2025-10-11T08:15:00Z", actor: "finance_admin", action: "APPROVE", note: "Budget allocated" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    costBreakdown: { flights: 350, accommodation: 800, groundTransfers: 90, perDiem: 1250, totalCost: 2490 },
  },
  {
    id: "req-004", ttrNumber: "TTR-2026-00004",
    employeeName: "Setareki Tukana", employeeNumber: "ITT-VIS-023",
    position: "Visa Processing Manager", department: "Visa / Immigration Services", employeeId: "employee",
    destination: { code: "SIN", city: "Singapore", country: "Singapore" },
    startDate: "2025-11-20", endDate: "2025-11-23",
    purpose: "Regional immigration compliance workshop and embassy liaison meetings for ITT corporate visa program",
    perDiem: { totalFJD: 1100, days: 4, mieFJD: 280, firstDayFJD: 210, middleDaysFJD: 560, lastDayFJD: 210 },
    visaCheck: { status: "ACTION", message: "Electronic visa required. Apply online 2 weeks before travel." },
    status: "in_review", submittedAt: "2025-10-18T14:30:00Z",
    costCentre: { code: "400-VIS", name: "Visa / Immigration Services" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 0,
    history: [{ ts: "2025-10-18T14:30:00Z", actor: "employee", action: "SUBMIT", note: "Compliance training invitation received" }],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: false,
    costBreakdown: { flights: 2200, accommodation: 1520, visaFees: 150, perDiem: 1100, totalCost: 4970 },
  },
  {
    id: "req-005", ttrNumber: "TTR-2026-00005",
    employeeName: "Mereoni Delai", employeeNumber: "ITT-CSR-089",
    position: "Customer Service Lead", department: "Customer Service / Reservations", employeeId: "employee",
    destination: { code: "SUV", city: "Suva", country: "Fiji" },
    startDate: "2026-03-13", endDate: "2026-03-15",
    emergencyContactName: "Ratu Peni Delai", emergencyContactPhone: "+679 956 7890", countryRiskLevel: "low",
    purpose: "ITT customer service excellence training and new reservation system rollout at Suva headquarters",
    perDiem: { totalFJD: 950, days: 3, mieFJD: 320, firstDayFJD: 240, middleDaysFJD: 320, lastDayFJD: 240 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
    status: "approved", submittedAt: "2025-10-14T08:45:00Z",
    costCentre: { code: "500-CSR", name: "Customer Service / Reservations" }, fundingType: "reimbursement",
    approverFlow: ["manager", "finance_admin"], approverIndex: 2,
    history: [
      { ts: "2025-10-14T08:45:00Z", actor: "employee", action: "SUBMIT", note: "System training mandatory for Q4 launch" },
      { ts: "2025-10-15T11:00:00Z", actor: "manager", action: "APPROVE", note: "Critical for service delivery" },
      { ts: "2025-10-15T16:30:00Z", actor: "finance_admin", action: "APPROVE", note: "Training budget approved" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    costBreakdown: { flights: 200, accommodation: 540, groundTransfers: 70, perDiem: 950, totalCost: 1760 },
  },
  {
    id: "req-006", ttrNumber: "TTR-2026-00006",
    employeeName: "Tevita Raicebe", employeeNumber: "ITT-FIN-065",
    position: "Chief Financial Officer", department: "Finance & Accounting", employeeId: "employee",
    destination: { code: "SYD", city: "Sydney", country: "Australia" },
    startDate: "2025-12-01", endDate: "2025-12-04",
    purpose: "ITT Q4 financial review with regional auditors and strategic budget planning for FY2026",
    perDiem: { totalFJD: 1700, days: 4, mieFJD: 430, firstDayFJD: 322.5, middleDaysFJD: 860, lastDayFJD: 322.5 },
    visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
    status: "submitted", submittedAt: "2025-10-20T10:15:00Z",
    costCentre: { code: "600-FIN", name: "Finance & Accounting" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 0,
    history: [{ ts: "2025-10-20T10:15:00Z", actor: "employee", action: "SUBMIT", note: "CFO quarterly financial review - critical" }],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
    costBreakdown: { flights: 2500, accommodation: 1600, groundTransfers: 160, visaFees: 250, perDiem: 1700, totalCost: 6210 },
  },
  {
    id: "req-007", ttrNumber: "TTR-2026-00007",
    employeeName: "Kalisi Radrodro", employeeNumber: "ITT-TEC-112",
    position: "Head of Data Analytics", department: "Technology & Data", employeeId: "employee",
    destination: { code: "AKL", city: "Auckland", country: "New Zealand" },
    startDate: "2026-03-04", endDate: "2026-03-09", countryRiskLevel: "low",
    purpose: "Enterprise data platform migration planning and cloud infrastructure vendor consultations",
    perDiem: { totalFJD: 1800, days: 4, mieFJD: 455, firstDayFJD: 341.25, middleDaysFJD: 910, lastDayFJD: 341.25 },
    visaCheck: { status: "OK", message: "No visa required for New Zealand." },
    status: "approved", submittedAt: "2025-10-08T13:20:00Z",
    costCentre: { code: "700-TEC", name: "Technology & Data" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 2,
    history: [
      { ts: "2025-10-08T13:20:00Z", actor: "employee", action: "SUBMIT", note: "Strategic technology investment - data transformation" },
      { ts: "2025-10-09T09:00:00Z", actor: "manager", action: "APPROVE", note: "Critical infrastructure initiative approved" },
      { ts: "2025-10-09T14:45:00Z", actor: "finance_admin", action: "APPROVE", note: "Capital expenditure approved" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    costBreakdown: { flights: 1800, accommodation: 1400, groundTransfers: 130, perDiem: 1800, totalCost: 5130 },
  },
  {
    id: "req-008", ttrNumber: "TTR-2026-00008",
    employeeName: "Roshni Lal", employeeNumber: "ITT-MKT-134",
    position: "Regional Marketing Director", department: "Marketing & Sales", employeeId: "employee",
    destination: { code: "SIN", city: "Singapore", country: "Singapore" },
    startDate: "2025-11-25", endDate: "2025-11-29",
    purpose: "Island Travel Technologies brand launch campaign planning and regional distributor partnership summit",
    perDiem: { totalFJD: 1950, days: 5, mieFJD: 395, firstDayFJD: 296.25, middleDaysFJD: 1185, lastDayFJD: 296.25 },
    visaCheck: { status: "ACTION", message: "Electronic visa required. Apply online 2 weeks before travel." },
    status: "rejected", submittedAt: "2025-10-17T09:30:00Z",
    costCentre: { code: "800-MKT", name: "Marketing & Sales" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 1,
    history: [
      { ts: "2025-10-17T09:30:00Z", actor: "employee", action: "SUBMIT", note: "Major brand launch - regional marketing initiative" },
      { ts: "2025-10-18T11:15:00Z", actor: "manager", action: "REJECT", note: "Postponed to Q1 2026 due to product launch delay" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: false,
    costBreakdown: { flights: 2200, accommodation: 1900, visaFees: 150, perDiem: 1950, totalCost: 6200 },
  },
  {
    id: "req-009", ttrNumber: "TTR-2026-00009",
    employeeName: "Apisai Koroiadi", employeeNumber: "ITT-CMP-078",
    position: "Compliance & Risk Manager", department: "Compliance, Audit, Risk", employeeId: "employee",
    destination: { code: "SYD", city: "Sydney", country: "Australia" },
    startDate: "2026-03-10", endDate: "2026-03-14", countryRiskLevel: "low",
    purpose: "Regional compliance audit coordination and risk management framework implementation for ITT subsidiaries",
    perDiem: { totalFJD: 1600, days: 4, mieFJD: 405, firstDayFJD: 303.75, middleDaysFJD: 810, lastDayFJD: 303.75 },
    visaCheck: { status: "ACTION", message: "Visa required for Australia. Processing time: 2-4 weeks." },
    status: "approved", submittedAt: "2025-10-11T15:00:00Z",
    costCentre: { code: "900-CMP", name: "Compliance, Audit, Risk" }, fundingType: "reimbursement",
    approverFlow: ["manager", "finance_admin"], approverIndex: 2,
    history: [
      { ts: "2025-10-11T15:00:00Z", actor: "employee", action: "SUBMIT", note: "Mandatory regulatory compliance audit" },
      { ts: "2025-10-12T10:00:00Z", actor: "manager", action: "APPROVE", note: "Critical for audit certification" },
      { ts: "2025-10-12T16:20:00Z", actor: "finance_admin", action: "APPROVE", note: "Compliance budget approved" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: false,
    costBreakdown: { flights: 2500, accommodation: 1600, visaFees: 250, perDiem: 1600, totalCost: 5950 },
  },
  {
    id: "req-010", ttrNumber: "TTR-2026-00010",
    employeeName: "Salome Tawake", employeeNumber: "ITT-ADM-091",
    position: "Head of Human Resources", department: "Administration & HR", employeeId: "employee",
    destination: { code: "NAN", city: "Nadi", country: "Fiji" },
    startDate: "2025-12-05", endDate: "2025-12-07",
    purpose: "ITT annual HR strategy planning and workforce development initiatives for 480-employee corporate expansion",
    perDiem: { totalFJD: 1200, days: 3, mieFJD: 405, firstDayFJD: 303.75, middleDaysFJD: 405, lastDayFJD: 303.75 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji - no visa required." },
    status: "submitted", submittedAt: "2025-10-21T08:00:00Z",
    costCentre: { code: "1000-ADM", name: "Administration & HR" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 0,
    history: [{ ts: "2025-10-21T08:00:00Z", actor: "employee", action: "SUBMIT", note: "Annual HR strategic planning session" }],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    costBreakdown: { flights: 350, accommodation: 600, groundTransfers: 85, perDiem: 1200, totalCost: 2235 },
  },
  {
    id: "req-011", ttrNumber: "TTR-2026-00011",
    employeeName: "Viliame Koroi", employeeNumber: "ITT-SUB-145",
    position: "Subsidiary Operations Director", department: "Subsidiaries (Combined)", employeeId: "employee",
    destination: { code: "APW", city: "Apia", country: "Samoa" },
    startDate: "2026-03-03", endDate: "2026-03-18",
    emergencyContactName: "Losalini Koroi", emergencyContactPhone: "+679 990 1234", countryRiskLevel: "low",
    purpose: "Island Travel Technologies subsidiary coordination and regional market expansion strategy for Samoa operations",
    perDiem: { totalFJD: 1350, days: 4, mieFJD: 340, firstDayFJD: 255, middleDaysFJD: 680, lastDayFJD: 255 },
    visaCheck: { status: "OK", message: "No visa required for regional Pacific travel." },
    status: "approved", submittedAt: "2025-10-09T14:00:00Z",
    costCentre: { code: "1100-SUB", name: "Subsidiaries (Combined)" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin"], approverIndex: 2,
    history: [
      { ts: "2025-10-09T14:00:00Z", actor: "employee", action: "SUBMIT", note: "Regional subsidiary coordination - critical expansion" },
      { ts: "2025-10-10T09:30:00Z", actor: "manager", action: "APPROVE", note: "Strategic growth initiative approved" },
      { ts: "2025-10-10T15:00:00Z", actor: "finance_admin", action: "APPROVE", note: "Subsidiary budget approved" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    costBreakdown: { flights: 900, accommodation: 1000, groundTransfers: 100, perDiem: 1350, totalCost: 3350 },
  },
];

// ── CDP Travel Requests ───────────────────────────────────────────────────────

const cdpRequests = [
  {
    id: "cdp-req-001", ttrNumber: "CDP-2026-00001", companyCode: "cdp001",
    employeeName: "Mr. George Singh", employeeNumber: "CDP-OPS-001",
    position: "General Manager Operations", department: "Operations", employeeId: "user-cdp-gm-001",
    destination: { code: "NAN", city: "Nadi", country: "Fiji" },
    preferredRoute: "Suva → Nadi", travelMode: "Land", suggestedModes: ["Air", "Land"],
    startDate: "2026-04-08", endDate: "2026-04-09",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Operations meeting with Western Division team",
    perDiem: { totalFJD: 80, days: 2, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 0, lastDayFJD: 30 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "submitted", submittedAt: "2026-03-28T08:30:00Z",
    costCentre: { code: "CDP-OPS", name: "Operations" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 0,
    history: [{ ts: "2026-03-28T08:30:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — Operations meeting Western Division" }],
    needsFlights: false, needsAccommodation: false, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 145,
    costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 145, perDiem: 80, totalCost: 145 },
  },
  {
    id: "cdp-req-002", ttrNumber: "CDP-2026-00002", companyCode: "cdp001",
    employeeName: "Mr. Ashwin Ram", employeeNumber: "CDP-FIN-001",
    position: "Manager Finance", department: "Finance", employeeId: "user-cdp-fin-001",
    destination: { code: "LBS", city: "Labasa", country: "Fiji" },
    preferredRoute: "Suva → Labasa", travelMode: "Air", suggestedModes: ["Air", "Sea"],
    startDate: "2026-02-12", endDate: "2026-02-14",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Finance review and branch visit",
    perDiem: { totalFJD: 120, days: 3, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 40, lastDayFJD: 30 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "approved", submittedAt: "2026-02-03T09:15:00Z",
    costCentre: { code: "CDP-FIN", name: "Finance" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 3,
    history: [
      { ts: "2026-02-03T09:15:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — Finance review Labasa branch" },
      { ts: "2026-02-04T10:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved — routine finance visit" },
      { ts: "2026-02-04T14:30:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance approved" },
      { ts: "2026-02-05T08:00:00Z", actor: "user-cdp-ceo-001", action: "APPROVE", note: "Executive approval granted" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 420,
    costBreakdown: { flights: 220, accommodation: 80, groundTransfers: 0, perDiem: 120, totalCost: 420 },
  },
  {
    id: "cdp-req-003", ttrNumber: "CDP-2026-00003", companyCode: "cdp001",
    employeeName: "Mr. Sashi Singh", employeeNumber: "CDP-MD-001",
    position: "Managing Director", department: "Executive", employeeId: "user-cdp-md-001",
    destination: { code: "NAN", city: "Nadi", country: "Fiji" },
    preferredRoute: "Suva → Nadi", travelMode: "Air", suggestedModes: ["Air", "Land"],
    startDate: "2026-04-15", endDate: "2026-04-17",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Executive meeting with strategic partners",
    perDiem: { totalFJD: 120, days: 3, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 40, lastDayFJD: 30 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "ticketed", submittedAt: "2026-03-20T10:00:00Z",
    costCentre: { code: "CDP-EXEC", name: "Executive" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 3,
    history: [
      { ts: "2026-03-20T10:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — MD strategic partner meeting" },
      { ts: "2026-03-21T09:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved" },
      { ts: "2026-03-21T11:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Budget cleared" },
      { ts: "2026-03-21T14:00:00Z", actor: "user-cdp-ceo-001", action: "APPROVE", note: "Approved by CEO" },
      { ts: "2026-03-22T09:00:00Z", actor: "user-cdp-arr-001", action: "TICKET", note: "Flight booked — Fiji Airways FJ103" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 390,
    costBreakdown: { flights: 180, accommodation: 90, groundTransfers: 0, perDiem: 120, totalCost: 390 },
  },
  {
    id: "cdp-req-004", ttrNumber: "CDP-2026-00004", companyCode: "cdp001",
    employeeName: "Mr. Rajnil Singh", employeeNumber: "CDP-CEO-001",
    position: "Chief Executive Officer", department: "Executive", employeeId: "user-cdp-ceo-001",
    destination: { code: "SVU", city: "Savusavu", country: "Fiji" },
    preferredRoute: "Suva → Savusavu", travelMode: "Air", suggestedModes: ["Air", "Sea"],
    startDate: "2026-04-22", endDate: "2026-04-24",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Client relationship visit",
    perDiem: { totalFJD: 150, days: 3, mieFJD: 50, firstDayFJD: 37.5, middleDaysFJD: 50, lastDayFJD: 37.5 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "submitted", submittedAt: "2026-04-01T11:00:00Z",
    costCentre: { code: "CDP-EXEC", name: "Executive" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 0,
    history: [{ ts: "2026-04-01T11:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — CEO client relationship visit" }],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: false,
    totalEstimatedBudget: 510,
    costBreakdown: { flights: 280, accommodation: 80, groundTransfers: 0, perDiem: 150, totalCost: 510 },
  },
  {
    id: "cdp-req-005", ttrNumber: "CDP-2026-00005", companyCode: "cdp001",
    employeeName: "Mr. George Singh", employeeNumber: "CDP-OPS-001",
    position: "General Manager Operations", department: "Operations", employeeId: "user-cdp-gm-001",
    destination: { code: "LTK", city: "Lautoka", country: "Fiji" },
    preferredRoute: "Nadi → Lautoka", travelMode: "Land", suggestedModes: ["Land"],
    startDate: "2026-01-20", endDate: "2026-01-20",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Site operations visit",
    perDiem: { totalFJD: 40, days: 1, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 0, lastDayFJD: 30 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "approved", submittedAt: "2026-01-15T08:00:00Z",
    costCentre: { code: "CDP-OPS", name: "Operations" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 2,
    history: [
      { ts: "2026-01-15T08:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — site operations Lautoka" },
      { ts: "2026-01-15T13:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved — day trip" },
      { ts: "2026-01-15T15:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance approved" },
    ],
    needsFlights: false, needsAccommodation: false, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 55,
    costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 55, perDiem: 40, totalCost: 55 },
  },
  {
    id: "cdp-req-006", ttrNumber: "CDP-2026-00006", companyCode: "cdp001",
    employeeName: "Mr. Ashwin Ram", employeeNumber: "CDP-FIN-001",
    position: "Manager Finance", department: "Finance", employeeId: "user-cdp-fin-001",
    destination: { code: "NAU", city: "Nausori", country: "Fiji" },
    preferredRoute: "Suva → Nausori", travelMode: "Land", suggestedModes: ["Land"],
    startDate: "2026-01-28", endDate: "2026-01-28",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Bank and finance meetings",
    perDiem: { totalFJD: 30, days: 1, mieFJD: 30, firstDayFJD: 22.5, middleDaysFJD: 0, lastDayFJD: 22.5 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "approved", submittedAt: "2026-01-24T09:00:00Z",
    costCentre: { code: "CDP-FIN", name: "Finance" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 2,
    history: [
      { ts: "2026-01-24T09:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — bank meetings Nausori" },
      { ts: "2026-01-24T11:30:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved" },
      { ts: "2026-01-24T14:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance approved" },
    ],
    needsFlights: false, needsAccommodation: false, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 35,
    costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 35, perDiem: 30, totalCost: 35 },
  },
  {
    id: "cdp-req-007", ttrNumber: "CDP-2026-00007", companyCode: "cdp001",
    employeeName: "Mr. George Singh", employeeNumber: "CDP-OPS-001",
    position: "General Manager Operations", department: "Operations", employeeId: "user-cdp-gm-001",
    destination: { code: "LBS", city: "Labasa", country: "Fiji" },
    preferredRoute: "Suva → Labasa", travelMode: "Sea", suggestedModes: ["Air", "Sea"],
    startDate: "2026-03-05", endDate: "2026-03-07",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Cargo coordination and branch support",
    perDiem: { totalFJD: 90, days: 3, mieFJD: 30, firstDayFJD: 22.5, middleDaysFJD: 30, lastDayFJD: 22.5 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "rejected", submittedAt: "2026-02-20T10:00:00Z",
    reviewedAt: "2026-02-21T09:30:00Z", reviewedBy: "user-cdp-gm-001",
    reviewComment: "Timing not suitable for operational urgency — reschedule for next quarter.",
    costCentre: { code: "CDP-OPS", name: "Operations" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 0,
    history: [
      { ts: "2026-02-20T10:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — cargo coordination Labasa" },
      { ts: "2026-02-21T09:30:00Z", actor: "user-cdp-gm-001", action: "REJECT", note: "Timing not suitable for operational urgency — reschedule for next quarter" },
    ],
    needsFlights: false, needsAccommodation: true, needsVisa: false, needsTransport: false,
    totalEstimatedBudget: 220,
    costBreakdown: { flights: 0, accommodation: 130, groundTransfers: 0, perDiem: 90, totalCost: 220 },
  },
  {
    id: "cdp-req-008", ttrNumber: "CDP-2026-00008", companyCode: "cdp001",
    employeeName: "Mr. Rajnil Singh", employeeNumber: "CDP-CEO-001",
    position: "Chief Executive Officer", department: "Executive", employeeId: "user-cdp-ceo-001",
    destination: { code: "TVU", city: "Taveuni", country: "Fiji" },
    preferredRoute: "Suva → Taveuni", travelMode: "Air", suggestedModes: ["Air", "Sea"],
    startDate: "2026-03-28", endDate: "2026-04-02",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Regional client discussion",
    perDiem: { totalFJD: 150, days: 3, mieFJD: 50, firstDayFJD: 37.5, middleDaysFJD: 50, lastDayFJD: 37.5 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "approved", submittedAt: "2026-02-25T09:00:00Z",
    costCentre: { code: "CDP-EXEC", name: "Executive" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 3,
    history: [
      { ts: "2026-02-25T09:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — CEO regional client visit Taveuni" },
      { ts: "2026-02-26T08:30:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "Approved" },
      { ts: "2026-02-26T11:00:00Z", actor: "user-cdp-fin-001", action: "APPROVE", note: "Finance cleared" },
      { ts: "2026-02-26T14:30:00Z", actor: "user-cdp-md-001", action: "APPROVE", note: "MD approval — executive travel" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: false,
    totalEstimatedBudget: 560,
    costBreakdown: { flights: 320, accommodation: 90, groundTransfers: 0, perDiem: 150, totalCost: 560 },
  },
  {
    id: "cdp-req-009", ttrNumber: "CDP-2026-00009", companyCode: "cdp001",
    employeeName: "Mr. Ashwin Ram", employeeNumber: "CDP-FIN-001",
    position: "Manager Finance", department: "Finance", employeeId: "user-cdp-fin-001",
    destination: { code: "NAN", city: "Nadi", country: "Fiji" },
    preferredRoute: "Suva → Nadi", travelMode: "Land", suggestedModes: ["Air", "Land"],
    startDate: "2026-05-06", endDate: "2026-05-07",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Finance compliance meeting",
    perDiem: { totalFJD: 80, days: 2, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 0, lastDayFJD: 30 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "draft", submittedAt: "2026-04-02T14:00:00Z",
    costCentre: { code: "CDP-FIN", name: "Finance" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 0,
    history: [{ ts: "2026-04-02T14:00:00Z", actor: "user-cdp-arr-001", action: "COMMENT", note: "Draft created by Rajneelta — pending review before submission" }],
    needsFlights: false, needsAccommodation: false, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 150,
    costBreakdown: { flights: 0, accommodation: 0, groundTransfers: 150, perDiem: 80, totalCost: 150 },
  },
  {
    id: "cdp-req-010", ttrNumber: "CDP-2026-00010", companyCode: "cdp001",
    employeeName: "Mr. George Singh", employeeNumber: "CDP-OPS-001",
    position: "General Manager Operations", department: "Operations", employeeId: "user-cdp-gm-001",
    destination: { code: "NAN", city: "Nadi", country: "Fiji" },
    preferredRoute: "Suva → Nadi", travelMode: "Air", suggestedModes: ["Air", "Land"],
    startDate: "2026-04-28", endDate: "2026-04-30",
    emergencyContactName: "CDP Couriers HQ", emergencyContactPhone: "+679 000 0000", countryRiskLevel: "low",
    purpose: "Urgent management review",
    perDiem: { totalFJD: 120, days: 3, mieFJD: 40, firstDayFJD: 30, middleDaysFJD: 40, lastDayFJD: 30 },
    visaCheck: { status: "OK", message: "Domestic travel within Fiji — no visa required." },
    status: "in_review", submittedAt: "2026-04-03T08:00:00Z",
    costCentre: { code: "CDP-OPS", name: "Operations" }, fundingType: "advance",
    approverFlow: ["manager", "finance_admin", "super_admin"], approverIndex: 1,
    history: [
      { ts: "2026-04-03T08:00:00Z", actor: "user-cdp-arr-001", action: "SUBMIT", note: "Arranged by Rajneelta — urgent management review" },
      { ts: "2026-04-03T11:00:00Z", actor: "user-cdp-gm-001", action: "APPROVE", note: "GM approved — escalated to Finance" },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: false,
    totalEstimatedBudget: 405,
    costBreakdown: { flights: 180, accommodation: 105, groundTransfers: 0, perDiem: 120, totalCost: 405 },
  },
];

// ── CDP Expense Claims ────────────────────────────────────────────────────────

const cdpClaims = [
  {
    id: "claim-cdp-001", tclNumber: "TCL-CDP-00001", requestId: "cdp-req-002",
    travelRequestRef: "CDP-2026-00002", companyCode: "cdp001",
    employeeId: "user-cdp-fin-001", employeeName: "Mr. Ashwin Ram",
    lineItems: [
      { id: "li-c001-1", description: "Fiji Airways – Suva to Labasa return", category: "Flights", amount: 220, merchantName: "Fiji Airways", receiptDate: "2026-02-12" },
      { id: "li-c001-2", description: "Labasa accommodation – 2 nights Grand Eastern", category: "Accommodation", amount: 160, merchantName: "Grand Eastern Hotel Labasa", receiptDate: "2026-02-13" },
      { id: "li-c001-3", description: "Working meals – branch team", category: "Meals", amount: 85, merchantName: "Various Labasa", receiptDate: "2026-02-13" },
      { id: "li-c001-4", description: "Taxi – airport to town return", category: "Transport (Local)", amount: 40, merchantName: "Labasa Taxis", receiptDate: "2026-02-12" },
    ],
    totalAmount: "505", currency: "FJD", status: "paid",
    submittedAt: new Date("2026-02-18T09:00:00Z"),
    reviewedAt: new Date("2026-02-20T10:30:00Z"),
    reviewedBy: "Sashi Singh", reviewNotes: "All receipts verified. Payment processed.",
    reconciliation: { advanceAmount: 420, varianceAmount: 85 },
    createdAt: new Date("2026-02-17T08:00:00Z"), updatedAt: new Date("2026-02-20T10:30:00Z"),
  },
  {
    id: "claim-cdp-002", tclNumber: "TCL-CDP-00002", requestId: "cdp-req-005",
    travelRequestRef: "CDP-2026-00005", companyCode: "cdp001",
    employeeId: "user-cdp-gm-001", employeeName: "Mr. George Singh",
    lineItems: [
      { id: "li-c002-1", description: "Vehicle hire – Nadi to Lautoka", category: "Transport (Local)", amount: 55, merchantName: "Pacific Car Rental", receiptDate: "2026-01-20" },
      { id: "li-c002-2", description: "Working lunch – site supervisor", category: "Meals", amount: 42, merchantName: "Lautoka Catering", receiptDate: "2026-01-20" },
    ],
    totalAmount: "97", currency: "FJD", status: "paid",
    submittedAt: new Date("2026-01-22T08:30:00Z"),
    reviewedAt: new Date("2026-01-23T11:00:00Z"),
    reviewedBy: "Ashwin Ram", reviewNotes: "Day trip expenses verified. Approved.",
    reconciliation: { advanceAmount: 55, varianceAmount: 42 },
    createdAt: new Date("2026-01-21T16:00:00Z"), updatedAt: new Date("2026-01-23T11:00:00Z"),
  },
  {
    id: "claim-cdp-003", tclNumber: "TCL-CDP-00003", requestId: "cdp-req-006",
    travelRequestRef: "CDP-2026-00006", companyCode: "cdp001",
    employeeId: "user-cdp-fin-001", employeeName: "Mr. Ashwin Ram",
    lineItems: [
      { id: "li-c003-1", description: "Taxi Suva CBD to Nausori return", category: "Transport (Local)", amount: 35, merchantName: "Express Cabs Fiji", receiptDate: "2026-01-28" },
      { id: "li-c003-2", description: "Working lunch – bank representatives", category: "Meals", amount: 58, merchantName: "Bay of Bengal Nausori", receiptDate: "2026-01-28" },
    ],
    totalAmount: "93", currency: "FJD", status: "approved",
    submittedAt: new Date("2026-01-30T09:00:00Z"),
    reviewedAt: new Date("2026-01-31T14:00:00Z"),
    reviewedBy: "Sashi Singh", reviewNotes: "Approved. Awaiting next payment run.",
    reconciliation: null,
    createdAt: new Date("2026-01-29T17:00:00Z"), updatedAt: new Date("2026-01-31T14:00:00Z"),
  },
  {
    id: "claim-cdp-004", tclNumber: "TCL-CDP-00004", requestId: "cdp-req-008",
    travelRequestRef: "CDP-2026-00008", companyCode: "cdp001",
    employeeId: "user-cdp-ceo-001", employeeName: "Mr. Rajnil Singh",
    lineItems: [
      { id: "li-c004-1", description: "Fiji Airways – Suva to Taveuni return", category: "Flights", amount: 320, merchantName: "Fiji Airways", receiptDate: "2026-03-10" },
      { id: "li-c004-2", description: "Taveuni Estate – 2 nights accommodation", category: "Accommodation", amount: 180, merchantName: "Taveuni Estate Resort", receiptDate: "2026-03-11" },
      { id: "li-c004-3", description: "Client dinner – Taveuni", category: "Meals", amount: 135, merchantName: "Coconut Grove Restaurant", receiptDate: "2026-03-11" },
      { id: "li-c004-4", description: "4WD hire – airport to resort", category: "Transport (Local)", amount: 80, merchantName: "Taveuni 4WD Hire", receiptDate: "2026-03-10" },
    ],
    totalAmount: "715", currency: "FJD", status: "under_review",
    submittedAt: new Date("2026-03-15T10:00:00Z"),
    reviewedAt: null, reviewedBy: null, reviewNotes: null, reconciliation: null,
    createdAt: new Date("2026-03-14T16:30:00Z"), updatedAt: new Date("2026-03-15T10:00:00Z"),
  },
  {
    id: "claim-cdp-005", tclNumber: "TCL-CDP-00005", requestId: "cdp-req-003",
    travelRequestRef: "CDP-2026-00003", companyCode: "cdp001",
    employeeId: "user-cdp-md-001", employeeName: "Mr. Sashi Singh",
    lineItems: [
      { id: "li-c005-1", description: "Fiji Airways – Suva to Nadi return", category: "Flights", amount: 180, merchantName: "Fiji Airways", receiptDate: "2026-04-15" },
      { id: "li-c005-2", description: "Sheraton Fiji – 2 nights", category: "Accommodation", amount: 360, merchantName: "Sheraton Fiji Golf & Beach Resort", receiptDate: "2026-04-16" },
      { id: "li-c005-3", description: "Business dinner – strategic partners", category: "Meals", amount: 220, merchantName: "Nadi Bay Resort Restaurant", receiptDate: "2026-04-16" },
      { id: "li-c005-4", description: "Working breakfast meeting", category: "Meals", amount: 65, merchantName: "Sheraton Fiji Café", receiptDate: "2026-04-17" },
      { id: "li-c005-5", description: "Airport transfers Nadi", category: "Transport (Local)", amount: 60, merchantName: "Pacific Transfers", receiptDate: "2026-04-17" },
    ],
    totalAmount: "885", currency: "FJD", status: "submitted",
    submittedAt: new Date("2026-04-20T09:30:00Z"),
    reviewedAt: null, reviewedBy: null, reviewNotes: null, reconciliation: null,
    createdAt: new Date("2026-04-19T15:00:00Z"), updatedAt: new Date("2026-04-20T09:30:00Z"),
  },
];

// ── Seed Functions ────────────────────────────────────────────────────────────

async function seedTravelRequests(): Promise<number> {
  let inserted = 0;

  const allRequests = [
    ...ittRequests.map(r => travelRequestRow(r, "itt001")),
    ...cdpRequests.map(r => travelRequestRow(r, r.companyCode)),
  ];

  for (const row of allRequests) {
    const existing = await db.select({ id: travelRequests.id })
      .from(travelRequests).where(eq(travelRequests.id, row.id));
    if (existing.length === 0) {
      await db.insert(travelRequests).values(row);
      inserted++;
    }
  }

  return inserted;
}

async function seedExpenseClaims(): Promise<number> {
  let inserted = 0;

  for (const claim of cdpClaims) {
    const existing = await db.select({ id: expenseClaims.id })
      .from(expenseClaims).where(eq(expenseClaims.id, claim.id));
    if (existing.length === 0) {
      await db.insert(expenseClaims).values(claim as any);
      inserted++;
    }
  }

  return inserted;
}

async function seedQuotePolicy(): Promise<number> {
  const existing = await db.select({ id: quotePolicies.id })
    .from(quotePolicies).where(eq(quotePolicies.companyCode, "itt001"));

  if (existing.length === 0) {
    const now = new Date("2025-01-01T00:00:00Z");
    await db.insert(quotePolicies).values({
      id: "policy-001",
      companyCode: "itt001",
      name: "Island Travel Technologies Quote Policy",
      minQuotesDomestic: 2,
      minQuotesInternational: 3,
      allowOverride: true,
      overrideRoles: ["manager", "finance_admin"],
      createdAt: now,
      updatedAt: now,
    });
    return 1;
  }
  return 0;
}

async function seedRefSequences(): Promise<number> {
  let inserted = 0;
  const year = 2026;

  const counters = [
    { companyCode: "itt001", prefix: "TTR", year, lastCounter: 11 },
    { companyCode: "cdp001", prefix: "CDP", year, lastCounter: 10 },
    { companyCode: "cdp001", prefix: "TCL", year, lastCounter: 0 },
  ];

  for (const counter of counters) {
    const existing = await db.select({ id: refSequences.id })
      .from(refSequences)
      .where(
        and(
          eq(refSequences.companyCode, counter.companyCode),
          eq(refSequences.prefix, counter.prefix),
          eq(refSequences.year, counter.year),
        ),
      );

    if (existing.length === 0) {
      await db.insert(refSequences).values({
        id: randomUUID(),
        ...counter,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted++;
    }
  }

  return inserted;
}

// ── Verification ──────────────────────────────────────────────────────────────

async function verify() {
  const [{ reqCount }] = await db.select({ reqCount: count() }).from(travelRequests);
  const [{ claimCount }] = await db.select({ claimCount: count() }).from(expenseClaims);
  const [{ policyCount }] = await db.select({ policyCount: count() }).from(quotePolicies);
  const [{ seqCount }] = await db.select({ seqCount: count() }).from(refSequences);
  const [{ quoteCount }] = await db.select({ quoteCount: count() }).from(travelQuotes);
  const [{ delCount }] = await db.select({ delCount: count() }).from(delegateAssignments);

  console.log("\n── DB Counts After Seed ──────────────────────────────────");
  console.log(`  travel_requests : ${reqCount}`);
  console.log(`  expense_claims  : ${claimCount}`);
  console.log(`  quote_policies  : ${policyCount}`);
  console.log(`  ref_sequences   : ${seqCount}`);
  console.log(`  travel_quotes   : ${quoteCount} (none seeded – added on demand via RFQ flow)`);
  console.log(`  delegate_assign : ${delCount} (none seeded – created on demand via Delegation UI)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Tokani TripFlow — seed.ts");
  console.log("────────────────────────────────────────────────────────");

  const reqsInserted = await seedTravelRequests();
  console.log(`  travel_requests  : ${reqsInserted} inserted (${21 - reqsInserted} already existed)`);

  const claimsInserted = await seedExpenseClaims();
  console.log(`  expense_claims   : ${claimsInserted} inserted (${5 - claimsInserted} already existed)`);

  const policiesInserted = await seedQuotePolicy();
  console.log(`  quote_policies   : ${policiesInserted} inserted (${1 - policiesInserted} already existed)`);

  const seqInserted = await seedRefSequences();
  console.log(`  ref_sequences    : ${seqInserted} inserted`);

  await verify();

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
