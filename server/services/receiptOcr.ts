import { GoogleGenAI } from "@google/genai";
import type { ExpenseCategory } from "@shared/types";

export interface OcrLineItem {
  description: string;
  amount: number;
}

export interface OcrResult {
  merchantName: string | null;
  receiptDate: string | null;
  totalAmount: number | null;
  currency: string;
  category: ExpenseCategory;
  lineItems: OcrLineItem[];
  confidence: "high" | "medium" | "low";
  rawText: string;
}

const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  restaurant: "Meals",
  cafe: "Meals",
  coffee: "Meals",
  food: "Meals",
  hotel: "Accommodation",
  accommodation: "Accommodation",
  motel: "Accommodation",
  lodging: "Accommodation",
  taxi: "Transport (Local)",
  uber: "Transport (Local)",
  transport: "Transport (Local)",
  bus: "Transport (Local)",
  fuel: "Transport (Local)",
  petrol: "Transport (Local)",
  airline: "Flights",
  airways: "Flights",
  flight: "Flights",
  air: "Flights",
  visa: "Visa / Entry Fees",
  immigration: "Visa / Entry Fees",
  embassy: "Visa / Entry Fees",
  phone: "Communication",
  telecom: "Communication",
  internet: "Communication",
  data: "Communication",
};

function inferCategory(merchantName: string | null, rawText: string): ExpenseCategory {
  const combined = `${merchantName || ""} ${rawText}`.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (combined.includes(keyword)) return category;
  }
  return "Other";
}

function inferConfidence(result: Partial<OcrResult>): "high" | "medium" | "low" {
  const hasAll = result.merchantName && result.receiptDate && result.totalAmount !== null;
  const hasAmount = result.totalAmount !== null;
  if (hasAll) return "high";
  if (hasAmount) return "medium";
  return "low";
}

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string
): Promise<OcrResult> {
  const ai = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });

  const prompt = `You are a receipt data extraction assistant. Analyze this receipt image and extract the following information.

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation, just the JSON):
{
  "merchantName": "name of the store/restaurant/business or null if unclear",
  "receiptDate": "date in YYYY-MM-DD format or null if unclear",
  "totalAmount": total amount as a number (not string) or null if unclear,
  "currency": "currency code e.g. FJD, AUD, USD, NZD",
  "lineItems": [
    { "description": "item description", "amount": 0.00 }
  ],
  "rawText": "all visible text from the receipt in one string"
}

Rules:
- totalAmount must be a number (e.g. 45.50) not a string
- If currency symbol is $ and location hints suggest Fiji, use "FJD"
- Include all line items you can read
- If a field is truly unreadable, use null
- Do not include any text outside the JSON object`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
  });

  const text = (response.text ?? "").trim();

  let parsed: Partial<OcrResult & { lineItems: OcrLineItem[] }>;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      merchantName: null,
      receiptDate: null,
      totalAmount: null,
      currency: "FJD",
      category: "Other",
      lineItems: [],
      confidence: "low",
      rawText: text,
    };
  }

  const merchantName = parsed.merchantName || null;
  const rawText = parsed.rawText || "";
  const category = inferCategory(merchantName, rawText);

  const ocrResult: OcrResult = {
    merchantName,
    receiptDate: parsed.receiptDate || null,
    totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : null,
    currency: parsed.currency || "FJD",
    category,
    lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
    confidence: "high",
    rawText,
  };

  ocrResult.confidence = inferConfidence(ocrResult);

  return ocrResult;
}
