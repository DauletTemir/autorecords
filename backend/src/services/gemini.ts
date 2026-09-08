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
  receipt_number: string;
}

const EMPTY_FIELDS: Array<keyof ExtractedDocument> = [
  "vin", "brand", "model", "year", "plate", "date",
  "service_type", "description", "mileage", "cost", "comment", "receipt_number",
];

export type SupportedLang = "en" | "ru" | "kk";

const PROMPT_LANGUAGE_NAME: Record<SupportedLang, string> = {
  en: "English",
  ru: "Russian",
  kk: "Kazakh",
};

// The extracted text fields are written in whatever language the source
// document is actually in, never the app's current UI language — the UI
// language is just what page the user happens to be on when they upload a
// photo, and has nothing to do with what language the document was written
// in. Records are stored once and read later, possibly with the UI set to
// a different language by then, so keying off the document's own language
// is the only choice that stays correct regardless of when it's viewed.
// `lang` is used only as a fallback for the rare case Gemini can't
// determine the document's language at all (e.g. it's mostly numbers/a
// logo with no legible body text).
function buildPrompt(lang: SupportedLang, knownVins: string[]): string {
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
  "comment": "anything else useful, incl. service center name",
  "receipt_number": "the invoice/work order/receipt's own printed number or ID, if visible (e.g. 'No. 4521', 'Order #7719') — not the VIN or plate — or empty if the document has none"
}
Write "service_type", "description" and "comment" in the SAME language the
document itself is written in (detect it from the visible text — e.g. a
Russian-language invoice gets Russian fields, a Kazakh-language invoice
gets Kazakh fields), not in any other language. Only if the document's
language truly cannot be determined, default to ${PROMPT_LANGUAGE_NAME[lang]}.
If a field is unreadable or absent, use an empty string.`;
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

function isTransientOverload(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /"code":503|UNAVAILABLE|overloaded|high demand/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini occasionally returns 503 UNAVAILABLE during brief spikes in
// platform-wide demand, unrelated to our own quota — Google's own error
// message calls these "usually temporary". A couple of short retries
// resolves most of them without the user ever seeing an error.
const OVERLOAD_RETRY_DELAYS_MS = [1000, 3000];

export async function analyzeDocumentImage(
  base64: string,
  mediaType: string,
  lang: SupportedLang,
  knownVins: string[],
): Promise<ExtractedDocument> {
  const contents = [
    { inlineData: { data: base64, mimeType: mediaType } },
    { text: buildPrompt(lang, knownVins) },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt <= OVERLOAD_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await ai.models.generateContent({ model: env.GEMINI_MODEL, contents });
      const text = response.text;
      if (!text) throw new Error("Empty response from model");
      return extractJson(text);
    } catch (err) {
      lastError = err;
      if (!isTransientOverload(err) || attempt === OVERLOAD_RETRY_DELAYS_MS.length) throw err;
      await sleep(OVERLOAD_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}
