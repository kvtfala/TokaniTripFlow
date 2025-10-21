import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { type PerDiemCalculation } from "@shared/types";

interface PerDiemPanelProps {
  calculation: PerDiemCalculation | null;
  loading?: boolean;
}

export function PerDiemPanel({ calculation, loading }: PerDiemPanelProps) {
  return (
    <Card data-testid="card-perdiem">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Per Diem Calculation
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!calculation ? (
          <p className="text-sm text-muted-foreground">
            Enter destination and dates to calculate per diem
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">First day (75%)</span>
                <span className="font-medium">FJD {calculation.firstDayFJD.toFixed(2)}</span>
              </div>
              {calculation.days > 2 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Full days ({calculation.days - 2} × FJD {calculation.mieFJD})
                  </span>
                  <span className="font-medium">FJD {calculation.middleDaysFJD.toFixed(2)}</span>
                </div>
              )}
              {calculation.days > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last day (75%)</span>
                  <span className="font-medium">FJD {calculation.lastDayFJD.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Per Diem</span>
                <span className="text-lg font-bold text-primary" data-testid="text-perdiem-total">
                  FJD {calculation.totalFJD.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {calculation.days} day{calculation.days !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
