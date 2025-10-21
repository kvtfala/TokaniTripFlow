import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";
import { type TravelRequest } from "@shared/types";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";

interface ApprovalDialogProps {
  request: TravelRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, comment: string) => void;
}

export function ApprovalDialog({ request, open, onOpenChange, onApprove, onReject }: ApprovalDialogProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");

  const handleConfirm = () => {
    if (!request) return;
    if (action === "approve") {
      onApprove(request.id);
    } else if (action === "reject" && comment.trim()) {
      onReject(request.id, comment);
    }
    setAction(null);
    setComment("");
    onOpenChange(false);
  };

  if (!request) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Travel Request</DialogTitle>
          <DialogDescription>
            Review the details and approve or reject this travel request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 py-4 border-y">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Employee</p>
              <p className="font-semibold">{request.employeeName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <StatusBadge status={request.status} type="request" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Destination</p>
              <p className="font-medium">
                {request.destination.city}, {request.destination.country}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Travel Dates</p>
              <p className="font-medium">
                {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Purpose</p>
            <p className="text-sm">{request.purpose}</p>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="font-semibold text-sm">Per Diem Breakdown</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">First day (75%)</span>
                <span>FJD {request.perDiem.firstDayFJD.toFixed(2)}</span>
              </div>
              {request.perDiem.days > 2 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full days ({request.perDiem.days - 2})</span>
                  <span>FJD {request.perDiem.middleDaysFJD.toFixed(2)}</span>
                </div>
              )}
              {request.perDiem.days > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last day (75%)</span>
                  <span>FJD {request.perDiem.lastDayFJD.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Total</span>
                <span className="text-primary">FJD {request.perDiem.totalFJD.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {action === "reject" && (
            <div>
              <Label htmlFor="comment">Rejection Comment *</Label>
              <Textarea
                id="comment"
                placeholder="Please provide a reason for rejection..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2"
                data-testid="input-reject-comment"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!action ? (
            <>
              <Button
                variant="outline"
                onClick={() => setAction("reject")}
                className="gap-2"
                data-testid="button-reject"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
              <Button
                onClick={() => setAction("approve")}
                className="gap-2"
                data-testid="button-approve"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setAction(null);
                  setComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={action === "reject" && !comment.trim()}
                variant={action === "approve" ? "default" : "destructive"}
                data-testid="button-confirm-action"
              >
                Confirm {action === "approve" ? "Approval" : "Rejection"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
