import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export interface ExtractedDocument {
  vin: string;
  brand: string;
  model: string;
  year: string;
  plate: string;
  date: string;
  service_type: string;
  description: string;
  mileage: string;
  cost: string;
  comment: string;
}

const EMPTY_FIELDS: Array<keyof ExtractedDocument> = [
  "vin", "brand", "model", "year", "plate", "date",
  "service_type", "description", "mileage", "cost", "comment",
];

function buildPrompt(lang: "en" | "ru", knownVins: string[]): string {
  return `You are an OCR/extraction system for an automotive service company. Analyze this photo or screenshot of a vehicle service document (invoice, work order, receipt) and extract structured data.

Known fleet VINs (if the document clearly refers to one of these vehicles by brand/model/plate but the VIN itself is not visible, use the matching VIN): ${knownVins.join(", ")}

Respond ONLY with a raw JSON object, no markdown fences, no explanations:
{
  "vin": "string or empty",
  "brand": "string or empty",
  "model": "string or empty",
  "year": "string or empty",
  "plate": "string or empty",
  "date": "YYYY-MM-DD or empty",
  "service_type": "short label, e.g. oil change / repair / diagnostics / parts",
  "description": "what was done or what was bought",
  "mileage": "number as string or empty",
  "cost": "total amount as number string or empty",
  "comment": "anything else useful, incl. service center name"
}
Write "service_type", "description" and "comment" in ${lang === "ru" ? "Russian" : "English"}. If a field is unreadable or absent, use an empty string.`;
}

export function extractJson(text: string): ExtractedDocument {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model did not return JSON. Response: " + text.slice(0, 200));

  const parsed = JSON.parse(match[0]);
  const result = {} as ExtractedDocument;
  for (const field of EMPTY_FIELDS) {
    result[field] = typeof parsed[field] === "string" ? parsed[field] : "";
  }
  return result;
}

export async function analyzeDocumentImage(
  base64: string,
  mediaType: string,
  lang: "en" | "ru",
  knownVins: string[],
): Promise<ExtractedDocument> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { data: base64, mimeType: mediaType } },
      { text: buildPrompt(lang, knownVins) },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from model");
  return extractJson(text);
}
