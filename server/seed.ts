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
  users,
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

// ── Tuvalu High Commission Travel Requests ─────────────────────────────────

const thcRequests = [
  {
    id: 'thc-req-001', ttrNumber: 'THC-2026-00001', companyCode: 'thc001',
    employeeName: 'Mr. Peni Taufa', employeeNumber: 'THC-OFF-001',
    position: 'Third Secretary', department: 'Consular', employeeId: 'user-thc-employee-001',
    destination: { code: 'SUV', city: 'Suva', country: 'Fiji' },
    preferredRoute: 'Funafuti → Suva', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-04-14', endDate: '2026-04-16',
    emergencyContactName: 'Semisi Pio', emergencyContactPhone: '+688 20 123', countryRiskLevel: 'low',
    purpose: 'Official consultation with Fiji Ministry of Foreign Affairs and trade delegation meetings',
    perDiem: { totalFJD: 1050, days: 3, mieFJD: 350, firstDayFJD: 262.5, middleDaysFJD: 350, lastDayFJD: 262.5 },
    visaCheck: { status: 'OK', message: 'No visa required for Fiji.' },
    status: 'ticketed', submittedAt: '2026-03-25T08:00:00Z',
    costCentre: { code: 'THC-CON', name: 'Consular' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 1,
    reviewedAt: '2026-03-26T10:00:00Z', reviewedBy: 'user-thc-manager-001',
    history: [
      { ts: '2026-03-25T08:00:00Z', actor: 'user-thc-employee-001', action: 'SUBMIT', note: 'Consultation requested by Ministry of Foreign Affairs Fiji' },
      { ts: '2026-03-26T10:00:00Z', actor: 'user-thc-manager-001', action: 'APPROVE', note: 'Approved — official government consultation' },
      { ts: '2026-03-27T09:00:00Z', actor: 'user-thc-employee-001', action: 'TICKET', note: 'Air Pacific flight confirmed — FJ-801' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 2100,
    costBreakdown: { flights: 680, accommodation: 370, groundTransfers: 80, perDiem: 1050, totalCost: 2100 },
  },
  {
    id: 'thc-req-002', ttrNumber: 'THC-2026-00002', companyCode: 'thc001',
    employeeName: 'Mr. Peni Taufa', employeeNumber: 'THC-OFF-001',
    position: 'Third Secretary', department: 'Political Affairs', employeeId: 'user-thc-employee-001',
    destination: { code: 'VLI', city: 'Port Vila', country: 'Vanuatu' },
    preferredRoute: 'Funafuti → Suva → Port Vila', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-05-20', endDate: '2026-05-24',
    emergencyContactName: 'Semisi Pio', emergencyContactPhone: '+688 20 123', countryRiskLevel: 'low',
    purpose: 'Pacific Islands Forum Dialogue on Climate Financing and Small Island Developing States priorities',
    perDiem: { totalFJD: 1750, days: 5, mieFJD: 350, firstDayFJD: 262.5, middleDaysFJD: 1050, lastDayFJD: 262.5 },
    visaCheck: { status: 'OK', message: 'No visa required for Vanuatu for Tuvalu passport holders.' },
    status: 'approved', submittedAt: '2026-04-28T09:00:00Z',
    costCentre: { code: 'THC-POL', name: 'Political Affairs' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 1,
    reviewedAt: '2026-04-29T11:00:00Z', reviewedBy: 'user-thc-manager-001',
    history: [
      { ts: '2026-04-28T09:00:00Z', actor: 'user-thc-employee-001', action: 'SUBMIT', note: 'PIF Dialogue — official delegation' },
      { ts: '2026-04-29T11:00:00Z', actor: 'user-thc-manager-001', action: 'APPROVE', note: 'Approved — strategic Pacific engagement' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 3600,
    costBreakdown: { flights: 1400, accommodation: 900, groundTransfers: 120, perDiem: 1750, totalCost: 3600 },
  },
  {
    id: 'thc-req-003', ttrNumber: 'THC-2026-00003', companyCode: 'thc001',
    employeeName: 'Mr. Peni Taufa', employeeNumber: 'THC-OFF-001',
    position: 'Third Secretary', department: 'Consular', employeeId: 'user-thc-employee-001',
    destination: { code: 'DEL', city: 'New Delhi', country: 'India' },
    preferredRoute: 'Funafuti → Suva → Singapore → New Delhi', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-06-10', endDate: '2026-06-15',
    emergencyContactName: 'Semisi Pio', emergencyContactPhone: '+688 20 123', countryRiskLevel: 'low',
    purpose: 'Medical escort coordination and consular assistance for Tuvaluan nationals receiving medical treatment in India',
    perDiem: { totalFJD: 2100, days: 6, mieFJD: 350, firstDayFJD: 262.5, middleDaysFJD: 1400, lastDayFJD: 262.5 },
    visaCheck: { status: 'ACTION', message: 'Indian e-Visa required. Apply at least 4 business days before travel.' },
    status: 'submitted', submittedAt: '2026-05-10T10:00:00Z',
    costCentre: { code: 'THC-CON', name: 'Consular' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 0,
    history: [
      { ts: '2026-05-10T10:00:00Z', actor: 'user-thc-employee-001', action: 'SUBMIT', note: 'Urgent — medical escort for 3 Tuvaluan nationals' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
    totalEstimatedBudget: 5800,
    costBreakdown: { flights: 2800, accommodation: 1200, groundTransfers: 200, visaFees: 150, perDiem: 2100, totalCost: 5800 },
  },
  {
    id: 'thc-req-004', ttrNumber: 'THC-2026-00004', companyCode: 'thc001',
    employeeName: 'Mr. Semisi Pio', employeeNumber: 'THC-MGR-001',
    position: 'High Commissioner', department: 'Executive', employeeId: 'user-thc-manager-001',
    destination: { code: 'CBR', city: 'Canberra', country: 'Australia' },
    preferredRoute: 'Funafuti → Suva → Sydney → Canberra', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-06-02', endDate: '2026-06-05',
    emergencyContactName: 'Tuvalu Foreign Affairs', emergencyContactPhone: '+688 20 800', countryRiskLevel: 'low',
    purpose: 'Bilateral government meeting with Australian Department of Foreign Affairs — climate resilience funding and migration pathways',
    perDiem: { totalFJD: 1800, days: 4, mieFJD: 450, firstDayFJD: 337.5, middleDaysFJD: 900, lastDayFJD: 337.5 },
    visaCheck: { status: 'ACTION', message: 'Australian visa or eVisitor required for official travel.' },
    status: 'in_review', submittedAt: '2026-05-08T08:00:00Z',
    costCentre: { code: 'THC-EXEC', name: 'Executive' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 0,
    history: [
      { ts: '2026-05-08T08:00:00Z', actor: 'user-thc-manager-001', action: 'SUBMIT', note: 'Bilateral meeting — DFAT scheduled by Australian High Commission Fiji' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
    totalEstimatedBudget: 6200,
    costBreakdown: { flights: 2800, accommodation: 1400, groundTransfers: 200, visaFees: 250, perDiem: 1800, totalCost: 6200 },
  },
];

// ── Kiribati High Commission Travel Requests ──────────────────────────────────

const khcRequests = [
  {
    id: 'khc-req-001', ttrNumber: 'KHC-2026-00001', companyCode: 'khc001',
    employeeName: 'Ms. Tearia Tabai', employeeNumber: 'KHC-OFF-001',
    position: 'Second Secretary', department: 'Consular', employeeId: 'user-khc-employee-001',
    destination: { code: 'TRW', city: 'Tarawa', country: 'Kiribati' },
    preferredRoute: 'Suva → Tarawa', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-04-08', endDate: '2026-04-12',
    emergencyContactName: 'Bwere Ieang', emergencyContactPhone: '+686 21 234', countryRiskLevel: 'low',
    purpose: 'Consular assistance visit and document processing for Kiribati nationals — liaison with Government of Kiribati on passports and civil status',
    perDiem: { totalFJD: 1600, days: 5, mieFJD: 320, firstDayFJD: 240, middleDaysFJD: 960, lastDayFJD: 240 },
    visaCheck: { status: 'OK', message: 'No visa required for Kiribati nationals visiting Tarawa.' },
    status: 'ticketed', submittedAt: '2026-03-18T09:30:00Z',
    costCentre: { code: 'KHC-CON', name: 'Consular' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 1,
    reviewedAt: '2026-03-19T10:00:00Z', reviewedBy: 'user-khc-manager-001',
    history: [
      { ts: '2026-03-18T09:30:00Z', actor: 'user-khc-employee-001', action: 'SUBMIT', note: 'Consular visit — 47 pending passport applications' },
      { ts: '2026-03-19T10:00:00Z', actor: 'user-khc-manager-001', action: 'APPROVE', note: 'Approved — routine consular cycle' },
      { ts: '2026-03-20T08:00:00Z', actor: 'user-khc-employee-001', action: 'TICKET', note: 'Air Kiribati flight confirmed' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 2900,
    costBreakdown: { flights: 950, accommodation: 720, groundTransfers: 120, perDiem: 1600, totalCost: 2900 },
  },
  {
    id: 'khc-req-002', ttrNumber: 'KHC-2026-00002', companyCode: 'khc001',
    employeeName: 'Ms. Tearia Tabai', employeeNumber: 'KHC-OFF-001',
    position: 'Second Secretary', department: 'Environment', employeeId: 'user-khc-employee-001',
    destination: { code: 'NAN', city: 'Nadi', country: 'Fiji' },
    preferredRoute: 'South Tarawa → Nadi', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-05-06', endDate: '2026-05-09',
    emergencyContactName: 'Bwere Ieang', emergencyContactPhone: '+686 21 234', countryRiskLevel: 'low',
    purpose: 'Pacific Regional Climate and Ocean Resilience Conference — representing Kiribati on sea-level adaptation and loss and damage mechanisms',
    perDiem: { totalFJD: 1200, days: 4, mieFJD: 300, firstDayFJD: 225, middleDaysFJD: 600, lastDayFJD: 225 },
    visaCheck: { status: 'OK', message: 'No visa required for Fiji.' },
    status: 'approved', submittedAt: '2026-04-15T10:00:00Z',
    costCentre: { code: 'KHC-ENV', name: 'Environment' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 1,
    reviewedAt: '2026-04-16T09:00:00Z', reviewedBy: 'user-khc-manager-001',
    history: [
      { ts: '2026-04-15T10:00:00Z', actor: 'user-khc-employee-001', action: 'SUBMIT', note: 'Climate conference — Kiribati official delegation' },
      { ts: '2026-04-16T09:00:00Z', actor: 'user-khc-manager-001', action: 'APPROVE', note: 'Approved — priority climate engagement' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 2700,
    costBreakdown: { flights: 1100, accommodation: 800, groundTransfers: 100, perDiem: 1200, totalCost: 2700 },
  },
  {
    id: 'khc-req-003', ttrNumber: 'KHC-2026-00003', companyCode: 'khc001',
    employeeName: 'Ms. Tearia Tabai', employeeNumber: 'KHC-OFF-001',
    position: 'Second Secretary', department: 'Multilateral', employeeId: 'user-khc-employee-001',
    destination: { code: 'JFK', city: 'New York', country: 'United States' },
    preferredRoute: 'South Tarawa → Nadi → Los Angeles → New York', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-09-22', endDate: '2026-09-27',
    emergencyContactName: 'Bwere Ieang', emergencyContactPhone: '+686 21 234', countryRiskLevel: 'low',
    purpose: 'UN General Assembly 81st Session side meetings — Pacific SIDS statement support and bilateral consultations on climate financing',
    perDiem: { totalFJD: 2800, days: 6, mieFJD: 467, firstDayFJD: 350, middleDaysFJD: 1867, lastDayFJD: 350 },
    visaCheck: { status: 'ACTION', message: 'US B1/B2 visa or ESTA required. Official travel may require diplomatic visa — check with Kiribati Foreign Affairs.' },
    status: 'submitted', submittedAt: '2026-05-20T11:00:00Z',
    costCentre: { code: 'KHC-MLT', name: 'Multilateral' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 0,
    history: [
      { ts: '2026-05-20T11:00:00Z', actor: 'user-khc-employee-001', action: 'SUBMIT', note: 'UNGA — Kiribati delegation support, early submission for visa lead time' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: true, needsTransport: true,
    totalEstimatedBudget: 9400,
    costBreakdown: { flights: 4800, accommodation: 2400, groundTransfers: 200, visaFees: 300, perDiem: 2800, totalCost: 9400 },
  },
  {
    id: 'khc-req-004', ttrNumber: 'KHC-2026-00004', companyCode: 'khc001',
    employeeName: 'Ms. Bwere Ieang', employeeNumber: 'KHC-MGR-001',
    position: 'High Commissioner', department: 'Executive', employeeId: 'user-khc-manager-001',
    destination: { code: 'APW', city: 'Apia', country: 'Samoa' },
    preferredRoute: 'South Tarawa → Nadi → Apia', travelMode: 'Air', suggestedModes: ['Air'],
    startDate: '2026-06-16', endDate: '2026-06-19',
    emergencyContactName: 'Kiribati Foreign Affairs', emergencyContactPhone: '+686 21 099', countryRiskLevel: 'low',
    purpose: 'Pacific Forum Officials Meeting (FOM) — preparatory session for 2026 Pacific Islands Forum Leaders Summit',
    perDiem: { totalFJD: 1500, days: 4, mieFJD: 375, firstDayFJD: 281.25, middleDaysFJD: 750, lastDayFJD: 281.25 },
    visaCheck: { status: 'OK', message: 'No visa required for Samoa.' },
    status: 'in_review', submittedAt: '2026-05-25T09:00:00Z',
    costCentre: { code: 'KHC-EXEC', name: 'Executive' }, fundingType: 'advance',
    approverFlow: ['manager'], approverIndex: 0,
    history: [
      { ts: '2026-05-25T09:00:00Z', actor: 'user-khc-manager-001', action: 'SUBMIT', note: 'FOM preparatory — High Commissioner attendance required' },
    ],
    needsFlights: true, needsAccommodation: true, needsVisa: false, needsTransport: true,
    totalEstimatedBudget: 3600,
    costBreakdown: { flights: 1600, accommodation: 900, groundTransfers: 120, perDiem: 1500, totalCost: 3600 },
  },
];

// ── Tuvalu High Commission Expense Claims ─────────────────────────────────────

const thcClaims = [
  {
    id: 'claim-thc-001', tclNumber: 'TCL-THC-00001', requestId: 'thc-req-001',
    travelRequestRef: 'THC-2026-00001', companyCode: 'thc001',
    employeeId: 'user-thc-employee-001', employeeName: 'Mr. Peni Taufa',
    lineItems: [
      { id: 'li-thc-001-1', description: 'Air Pacific FJ-801 — Funafuti to Suva return', category: 'Flights', amount: 680, merchantName: 'Air Pacific', receiptDate: '2026-04-14' },
      { id: 'li-thc-001-2', description: 'Tanoa Plaza Hotel Suva — 2 nights', category: 'Accommodation', amount: 370, merchantName: 'Tanoa International Hotel', receiptDate: '2026-04-14' },
      { id: 'li-thc-001-3', description: 'Working meals — Ministry delegation', category: 'Meals', amount: 145, merchantName: 'Various Suva', receiptDate: '2026-04-15' },
      { id: 'li-thc-001-4', description: 'Taxi Suva CBD — Fijian Government complex', category: 'Transport (Local)', amount: 45, merchantName: 'Suva City Cabs', receiptDate: '2026-04-14' },
    ],
    totalAmount: '1240', currency: 'FJD', status: 'paid',
    submittedAt: new Date('2026-04-20T10:00:00Z'),
    reviewedAt: new Date('2026-04-22T14:00:00Z'),
    reviewedBy: 'Semisi Pio', reviewNotes: 'All official receipts verified. Payment processed.',
    reconciliation: { advanceAmount: 2100, varianceAmount: -860 },
    createdAt: new Date('2026-04-19T08:00:00Z'), updatedAt: new Date('2026-04-22T14:00:00Z'),
  },
];

// ── Kiribati High Commission Expense Claims ───────────────────────────────────

const khcClaims = [
  {
    id: 'claim-khc-001', tclNumber: 'TCL-KHC-00001', requestId: 'khc-req-001',
    travelRequestRef: 'KHC-2026-00001', companyCode: 'khc001',
    employeeId: 'user-khc-employee-001', employeeName: 'Ms. Tearia Tabai',
    lineItems: [
      { id: 'li-khc-001-1', description: 'Air Kiribati — Suva to Tarawa return', category: 'Flights', amount: 950, merchantName: 'Air Kiribati', receiptDate: '2026-04-08' },
      { id: 'li-khc-001-2', description: 'Otintaai Hotel Tarawa — 4 nights', category: 'Accommodation', amount: 720, merchantName: 'Otintaai Hotel', receiptDate: '2026-04-08' },
      { id: 'li-khc-001-3', description: 'Working meals — consular processing days', category: 'Meals', amount: 180, merchantName: 'Various Tarawa', receiptDate: '2026-04-09' },
      { id: 'li-khc-001-4', description: 'Ground transfers — airport and government offices', category: 'Transport (Local)', amount: 120, merchantName: 'Tarawa Transport', receiptDate: '2026-04-08' },
    ],
    totalAmount: '1970', currency: 'FJD', status: 'approved',
    submittedAt: new Date('2026-04-16T09:00:00Z'),
    reviewedAt: new Date('2026-04-18T11:00:00Z'),
    reviewedBy: 'Bwere Ieang', reviewNotes: 'Receipts verified. Approved for payment.',
    reconciliation: null,
    createdAt: new Date('2026-04-15T16:00:00Z'), updatedAt: new Date('2026-04-18T11:00:00Z'),
  },
];

// ── Seed Functions ────────────────────────────────────────────────────────────

async function seedTravelRequests(): Promise<number> {
  let inserted = 0;

  const allRequests = [
    ...ittRequests.map(r => travelRequestRow(r, "itt001")),
    ...thcRequests.map(r => travelRequestRow(r, r.companyCode)),
    ...khcRequests.map(r => travelRequestRow(r, r.companyCode)),
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

  for (const claim of [...thcClaims, ...khcClaims]) {
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
    { companyCode: "thc001", prefix: "THC", year, lastCounter: 4 },
    { companyCode: "thc001", prefix: "TCL", year, lastCounter: 1 },
    { companyCode: "khc001", prefix: "KHC", year, lastCounter: 4 },
    { companyCode: "khc001", prefix: "TCL", year, lastCounter: 1 },
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

// ── Demo Users ────────────────────────────────────────────────────────────────

// All demo orgs share one password: itt1235*
const DEMO_HASH = "$2b$10$btwIziGooE5YvHpoZJxjjeYgqya3zJPk2EWmSmW.p2/Ck6r64rUGS";

const demoUsers = [
  // ── Island Travel Technologies (itt001) ──
  { id: "user-itt-manager-001",     email: "desmond.bale@islandtraveltech.com",     firstName: "Desmond", lastName: "Bale",       role: "super_admin",   companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-employee-001",    email: "jone.ratudina@islandtraveltech.com",    firstName: "Jone",    lastName: "Ratudina",   role: "employee",      companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-coordinator-001", email: "litia.vuniyayawa@islandtraveltech.com", firstName: "Litia",   lastName: "Vuniyayawa", role: "coordinator",   companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-manager-002",     email: "tomasi.ravouvou@islandtraveltech.com",  firstName: "Tomasi",  lastName: "Ravouvou",   role: "manager",       companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-finance-001",     email: "mere.delana@islandtraveltech.com",      firstName: "Mere",    lastName: "Delana",     role: "finance_admin", companyCode: "itt001", passwordHash: DEMO_HASH },
  { id: "user-itt-travel-001",      email: "nemani.tui@islandtraveltech.com",       firstName: "Nemani",  lastName: "Tui",        role: "travel_admin",  companyCode: "itt001", passwordHash: DEMO_HASH },
  // ── Tuvalu High Commission (thc001) ──
  { id: "user-thc-employee-001",    email: "peni.taufa@tuvaluhighcomm.demo",        firstName: "Peni",    lastName: "Taufa",      role: "employee",      companyCode: "thc001", passwordHash: DEMO_HASH },
  { id: "user-thc-manager-001",     email: "semisi.pio@tuvaluhighcomm.demo",        firstName: "Semisi",  lastName: "Pio",        role: "manager",       companyCode: "thc001", passwordHash: DEMO_HASH },
  // ── Kiribati High Commission (khc001) ──
  { id: "user-khc-employee-001",    email: "tearia.tabai@kiribatihighcomm.demo",    firstName: "Tearia",  lastName: "Tabai",      role: "employee",      companyCode: "khc001", passwordHash: DEMO_HASH },
  { id: "user-khc-manager-001",     email: "bwere.ieang@kiribatihighcomm.demo",     firstName: "Bwere",   lastName: "Ieang",      role: "manager",       companyCode: "khc001", passwordHash: DEMO_HASH },
];

async function seedUsers(): Promise<number> {
  let inserted = 0;
  const now = new Date("2025-01-01T00:00:00Z");
  for (const u of demoUsers) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, u.id));
    if (existing.length === 0) {
      await db.insert(users).values({
        ...u,
        lastName: u.lastName ?? null,
        profileImageUrl: null,
        isActive: true,
        lastLogin: null,
        createdAt: now,
        updatedAt: now,
      } as any);
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
  const [{ userCount }] = await db.select({ userCount: count() }).from(users);

  console.log("\n── DB Counts After Seed ──────────────────────────────────");
  console.log(`  users           : ${userCount}`);
  console.log(`  travel_requests : ${reqCount}`);
  console.log(`  expense_claims  : ${claimCount}`);
  console.log(`  quote_policies  : ${policyCount}`);
  console.log(`  ref_sequences   : ${seqCount}`);
  console.log(`  travel_quotes   : ${quoteCount} (none seeded – added on demand via RFQ flow)`);
  console.log(`  delegate_assign : ${delCount} (none seeded – created on demand via Delegation UI)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function cleanupCdp(): Promise<void> {
  await db.delete(expenseClaims).where(eq(expenseClaims.companyCode, "cdp001"));
  await db.delete(travelRequests).where(eq(travelRequests.companyCode, "cdp001"));
  await db.delete(refSequences).where(eq(refSequences.companyCode, "cdp001"));
  await db.delete(users).where(eq(users.companyCode, "cdp001"));
  console.log("  cdp001 data      : purged (if any existed)");
}

async function main() {
  console.log("Tokani TripFlow — seed.ts");
  console.log("────────────────────────────────────────────────────────");

  await cleanupCdp();

  const usersInserted = await seedUsers();
  console.log(`  users            : ${usersInserted} inserted (${10 - usersInserted} already existed)`);

  const reqsInserted = await seedTravelRequests();
  console.log(`  travel_requests  : ${reqsInserted} inserted (${19 - reqsInserted} already existed)`);

  const claimsInserted = await seedExpenseClaims();
  console.log(`  expense_claims   : ${claimsInserted} inserted (${2 - claimsInserted} already existed)`);

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
