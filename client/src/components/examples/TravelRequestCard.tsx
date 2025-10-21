import { TravelRequestCard } from "../TravelRequestCard";
import { type TravelRequest } from "@shared/types";

export default function TravelRequestCardExample() {
  const mockRequest: TravelRequest = {
    id: "1",
    employeeName: "Jone Vakatawa",
    employeeId: "EMP001",
    destination: { code: "SYD", city: "Sydney", country: "Australia" },
    startDate: "2025-11-15",
    endDate: "2025-11-18",
    purpose: "Regional conference attendance",
    perDiem: {
      totalFJD: 325,
      days: 4,
      mieFJD: 100,
      firstDayFJD: 75,
      middleDaysFJD: 200,
      lastDayFJD: 50,
    },
    visaCheck: { status: "ACTION", message: "Visa required" },
    status: "pending",
    submittedAt: "2025-10-20T10:00:00Z",
  };

  return (
    <div className="p-8 max-w-md space-y-4">
      <TravelRequestCard request={mockRequest} onClick={() => console.log("Clicked request")} />
      <TravelRequestCard request={{ ...mockRequest, status: "approved" }} />
      <TravelRequestCard request={{ ...mockRequest, status: "rejected" }} />
    </div>
  );
}
