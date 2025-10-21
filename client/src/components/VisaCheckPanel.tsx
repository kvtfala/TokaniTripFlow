import { AlertTriangle, Shield, ExternalLink } from "lucide-react";
import { type VisaCheckResult } from "@shared/types";
import { StatusBadge } from "./StatusBadge";

interface VisaCheckPanelProps {
  result: VisaCheckResult | null;
}

export function VisaCheckPanel({ result }: VisaCheckPanelProps) {
  if (!result) return null;

  const bgColor =
    result.status === "OK"
      ? "bg-green-50 border-green-200"
      : result.status === "WARNING"
        ? "bg-yellow-50 border-yellow-200"
        : "bg-red-50 border-red-200";

  return (
    <div
      className={`rounded-lg border p-4 ${bgColor}`}
      data-testid="panel-visa-check"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {result.status === "OK" ? (
            <Shield className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={result.status} type="visa" />
          </div>
          <p className="text-sm font-medium">{result.message}</p>
          {result.policyLink && (
            <a
              href={result.policyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              data-testid="link-visa-policy"
            >
              View Policy
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
