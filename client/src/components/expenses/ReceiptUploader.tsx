import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle, AlertTriangle, X, ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ExpenseCategory } from "@shared/types";

export interface ExtractedReceiptData {
  merchantName: string | null;
  receiptDate: string | null;
  totalAmount: number | null;
  currency: string;
  category: ExpenseCategory;
  lineItems: { description: string; amount: number }[];
  confidence: "high" | "medium" | "low";
  rawText: string;
}

interface ReceiptUploaderProps {
  onExtracted: (data: ExtractedReceiptData, previewUrl: string) => void;
  onClear?: () => void;
  previewUrl?: string;
  compact?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ReceiptUploader({ onExtracted, onClear, previewUrl, compact = false }: ReceiptUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);

  async function processFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a JPG, PNG, WEBP, HEIC, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setConfidence(null);

    try {
      const imageBase64 = await fileToBase64(file);
      const localPreview = URL.createObjectURL(file);

      const response = await apiRequest("POST", "/api/uploads/ocr-receipt", {
        imageBase64,
        mimeType: file.type,
      });
      const { extractedData } = await response.json();

      setConfidence(extractedData.confidence);
      onExtracted(extractedData, localPreview);
    } catch (err: any) {
      setError(err?.message || "Failed to read receipt. Please fill in the details manually.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  if (previewUrl && !isProcessing) {
    return (
      <div className="relative group" data-testid="receipt-preview">
        <img
          src={previewUrl}
          alt="Receipt"
          className="w-full rounded-md object-cover border border-border"
          style={{ maxHeight: compact ? "120px" : "180px" }}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
          <Button size="icon" variant="secondary" onClick={() => inputRef.current?.click()} data-testid="button-replace-receipt">
            <Upload className="w-4 h-4" />
          </Button>
          {onClear && (
            <Button size="icon" variant="secondary" onClick={onClear} data-testid="button-clear-receipt">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        {confidence && (
          <div className="absolute top-2 left-2">
            {confidence === "high" ? (
              <Badge className="bg-green-600 text-white text-xs gap-1">
                <CheckCircle className="w-3 h-3" /> Auto-filled
              </Badge>
            ) : (
              <Badge className="bg-amber-500 text-white text-xs gap-1">
                <AlertTriangle className="w-3 h-3" /> Please review
              </Badge>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileInput} />
      </div>
    );
  }

  return (
    <div
      data-testid="receipt-uploader"
      className={`relative border-2 border-dashed rounded-md transition-colors cursor-pointer ${
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      } ${compact ? "p-3" : "p-6"}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileInput}
        data-testid="input-receipt-file"
      />
      <div className="flex flex-col items-center gap-2 text-center pointer-events-none select-none">
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Reading receipt...</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            {!compact && (
              <p className="text-sm font-medium">Drop receipt here or tap to upload</p>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG, HEIC, PDF — max 10MB</p>
            {!compact && (
              <Badge variant="secondary" className="text-xs">
                AI will read the receipt for you
              </Badge>
            )}
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive text-center pointer-events-none">{error}</p>
      )}
    </div>
  );
}
