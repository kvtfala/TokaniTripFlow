import jsPDF from "jspdf";
import type { TravelRequest } from "@shared/types";
import { format } from "date-fns";

/**
 * Generate a trip summary PDF for a travel request
 */
export function generateTripSummaryPDF(request: TravelRequest): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Tokani TripFlow", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(14);
  doc.text("Travel Request Summary", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Request ID and Status
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Request ID: ${request.id}`, 20, yPos);
  doc.text(`Status: ${request.status.toUpperCase()}`, pageWidth - 60, yPos);
  yPos += 10;

  // Employee Details Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Details", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${request.employeeName}`, 25, yPos);
  yPos += 6;
  doc.text(`Employee Number: ${request.employeeNumber}`, 25, yPos);
  yPos += 6;
  doc.text(`Position: ${request.position}`, 25, yPos);
  yPos += 6;
  doc.text(`Department: ${request.department}`, 25, yPos);
  yPos += 10;

  // Travel Details Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Travel Details", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Destination: ${request.destination.city}, ${request.destination.country}`, 25, yPos);
  yPos += 6;
  doc.text(
    `Travel Dates: ${format(new Date(request.startDate), "MMM dd, yyyy")} - ${format(
      new Date(request.endDate),
      "MMM dd, yyyy"
    )}`,
    25,
    yPos
  );
  yPos += 6;
  doc.text(`Duration: ${request.perDiem.days} days`, 25, yPos);
  yPos += 6;

  const purposeLines = doc.splitTextToSize(`Purpose: ${request.purpose}`, pageWidth - 50);
  doc.text(purposeLines, 25, yPos);
  yPos += purposeLines.length * 6 + 4;

  // Financial Details Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Details", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Cost Centre: ${request.costCentre.code} - ${request.costCentre.name}`, 25, yPos);
  yPos += 6;
  doc.text(`Funding Type: ${request.fundingType.charAt(0).toUpperCase() + request.fundingType.slice(1)}`, 25, yPos);
  yPos += 10;

  // Per Diem Breakdown
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Per Diem Breakdown", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`First Day (75%): FJD ${request.perDiem.firstDayFJD.toFixed(2)}`, 25, yPos);
  yPos += 6;

  if (request.perDiem.days > 2) {
    doc.text(
      `Full Days (${request.perDiem.days - 2} days): FJD ${request.perDiem.middleDaysFJD.toFixed(2)}`,
      25,
      yPos
    );
    yPos += 6;
  }

  if (request.perDiem.days > 1) {
    doc.text(`Last Day (75%): FJD ${request.perDiem.lastDayFJD.toFixed(2)}`, 25, yPos);
    yPos += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text(`Total Per Diem: FJD ${request.perDiem.totalFJD.toFixed(2)}`, 25, yPos);
  yPos += 10;

  // Visa Status (if available)
  if (request.visaCheck) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Visa Information", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${request.visaCheck.status}`, 25, yPos);
    yPos += 6;
    const visaLines = doc.splitTextToSize(request.visaCheck.message, pageWidth - 50);
    doc.text(visaLines, 25, yPos);
    yPos += visaLines.length * 6 + 10;
  }

  // Services Required
  if (request.needsFlights || request.needsAccommodation || request.needsVisa || request.needsTransport) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Services Required", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const services = [];
    if (request.needsFlights) services.push("Flight Booking");
    if (request.needsAccommodation) services.push("Accommodation");
    if (request.needsVisa) services.push("Visa Assistance");
    if (request.needsTransport) services.push("Ground Transport");

    services.forEach((service) => {
      doc.text(`• ${service}`, 25, yPos);
      yPos += 6;
    });
    yPos += 4;
  }

  // Approval History
  if (request.history && request.history.length > 0) {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Approval History", 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    request.history.forEach((entry) => {
      const timestamp = format(new Date(entry.ts), "MMM dd, yyyy HH:mm");
      doc.text(`${timestamp} - ${entry.action} by ${entry.actor}`, 25, yPos);
      yPos += 5;

      if (entry.note) {
        doc.setFont("helvetica", "italic");
        const noteLines = doc.splitTextToSize(entry.note, pageWidth - 55);
        doc.text(noteLines, 30, yPos);
        yPos += noteLines.length * 5;
        doc.setFont("helvetica", "normal");
      }

      yPos += 3;

      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated on ${format(new Date(), "MMM dd, yyyy HH:mm")} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `travel_request_${request.id}_${request.employeeName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
