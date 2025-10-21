import { useState } from "react";
import { ApprovalDialog } from "../ApprovalDialog";
import { Button } from "@/components/ui/button";
import { type TravelRequest } from "@shared/types";

export default function ApprovalDialogExample() {
  const [open, setOpen] = useState(false);

  const mockRequest: TravelRequest = {
    id: "1",
    employeeName: "Jone Vakatawa",
    employeeId: "EMP001",
    destination: { code: "SYD", city: "Sydney", country: "Australia" },
    startDate: "2025-11-15",
    endDate: "2025-11-18",
    purpose: "Regional conference attendance and stakeholder meetings",
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
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Approval Dialog</Button>
      <ApprovalDialog
        request={mockRequest}
        open={open}
        onOpenChange={setOpen}
        onApprove={(id) => {
          console.log("Approved:", id);
          alert("Request approved!");
        }}
        onReject={(id, comment) => {
          console.log("Rejected:", id, comment);
          alert(`Request rejected: ${comment}`);
        }}
      />
    </div>
  );
}
