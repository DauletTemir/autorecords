import { describe, expect, it, vi, beforeEach } from "vitest";

const generateContentMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: function GoogleGenAI() {
    return { models: { generateContent: generateContentMock } };
  },
}));
vi.mock("../../config/env.js", () => ({ env: { GEMINI_API_KEY: "fake-key" } }));

const { extractJson, analyzeDocumentImage } = await import("../gemini.js");

describe("extractJson", () => {
  it("parses a clean JSON object", () => {
    const text = '{"vin":"1HGCM82633A123456","brand":"Honda","model":"Accord","year":"2018","plate":"","date":"2026-01-01","service_type":"Oil change","description":"","mileage":"50000","cost":"45.00","comment":"","receipt_number":"No. 4521"}';
    const result = extractJson(text);
    expect(result.vin).toBe("1HGCM82633A123456");
    expect(result.brand).toBe("Honda");
    expect(result.cost).toBe("45.00");
    expect(result.receipt_number).toBe("No. 4521");
  });

  it("defaults receipt_number to empty when the document has none", () => {
    const text = '{"vin":"ABC123","receipt_number":""}';
    const result = extractJson(text);
    expect(result.receipt_number).toBe("");
  });

  it("extracts JSON even when wrapped in markdown fences or prose", () => {
    const text = 'Here is the result:\n```json\n{"vin":"","brand":"Kia","model":"Sportage","year":"","plate":"","date":"","service_type":"","description":"","mileage":"","cost":"","comment":""}\n```';
    const result = extractJson(text);
    expect(result.brand).toBe("Kia");
  });

  it("fills missing fields with empty strings instead of throwing", () => {
    const text = '{"vin":"ABC123"}';
    const result = extractJson(text);
    expect(result.vin).toBe("ABC123");
    expect(result.brand).toBe("");
    expect(result.comment).toBe("");
  });

  it("throws a descriptive error when no JSON object is present", () => {
    expect(() => extractJson("Sorry, I cannot process this image.")).toThrow(/did not return JSON/);
  });

  it("ignores non-string values instead of leaking objects/numbers into fields", () => {
    const text = '{"vin":"ABC123","mileage":50000,"comment":null}';
    const result = extractJson(text);
    expect(result.mileage).toBe("");
    expect(result.comment).toBe("");
  });
});

describe("analyzeDocumentImage — transient overload retry", () => {
  const VALID_RESPONSE = { text: '{"vin":"ABC123","brand":"Kia","model":"Sportage","year":"","plate":"","date":"","service_type":"","description":"","mileage":"","cost":"","comment":""}' };
  const OVERLOAD_ERROR = new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}');

  beforeEach(() => {
    generateContentMock.mockReset();
    vi.useFakeTimers();
  });

  it("returns the successful result on the first try without retrying", async () => {
    generateContentMock.mockResolvedValue(VALID_RESPONSE);

    const result = await analyzeDocumentImage("base64data", "image/jpeg", "en", []);

    expect(result.brand).toBe("Kia");
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("retries after a transient 503/UNAVAILABLE error and succeeds on the second attempt", async () => {
    generateContentMock.mockRejectedValueOnce(OVERLOAD_ERROR).mockResolvedValueOnce(VALID_RESPONSE);

    const promise = analyzeDocumentImage("base64data", "image/jpeg", "en", []);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.brand).toBe("Kia");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("gives up and throws after exhausting all retries on persistent overload", async () => {
    generateContentMock.mockRejectedValue(OVERLOAD_ERROR);

    const promise = analyzeDocumentImage("base64data", "image/jpeg", "en", []);
    const assertion = expect(promise).rejects.toThrow(/UNAVAILABLE/);
    await vi.runAllTimersAsync();
    await assertion;

    // Initial attempt + 2 retries per OVERLOAD_RETRY_DELAYS_MS.
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-transient error (e.g. quota exceeded)", async () => {
    const quotaError = new Error('{"error":{"code":429,"message":"You exceeded your current quota","status":"RESOURCE_EXHAUSTED"}}');
    generateContentMock.mockRejectedValue(quotaError);

    await expect(analyzeDocumentImage("base64data", "image/jpeg", "en", [])).rejects.toThrow(/RESOURCE_EXHAUSTED/);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });
});

describe("analyzeDocumentImage — prompt language instructions", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    generateContentMock.mockResolvedValue({
      text: '{"vin":"","brand":"","model":"","year":"","plate":"","date":"","service_type":"","description":"","mileage":"","cost":"","comment":""}',
    });
  });

  function getPromptText() {
    const call = generateContentMock.mock.calls[0][0];
    return call.contents.find((c) => "text" in c).text;
  }

  // Regression: the prompt used to hardcode the field language to whatever
  // the app's current UI language was at upload time. Since records are
  // stored once and can be viewed later under a different UI language,
  // that produced English UI pages showing Russian/Kazakh text and vice
  // versa. The extracted fields must match the document's own language
  // instead, regardless of which `lang` (UI language) is passed in.
  it.each(["en", "ru", "kk"] as const)("instructs the model to match the document's own language regardless of UI lang=%s", async (lang) => {
    await analyzeDocumentImage("base64data", "image/jpeg", lang, []);
    const prompt = getPromptText();

    expect(prompt).toMatch(/same language the\s+document itself is written in/i);
  });

  it("still passes the UI language through as a fallback for when the document's language can't be determined", async () => {
    await analyzeDocumentImage("base64data", "image/jpeg", "kk", []);
    const prompt = getPromptText();

    expect(prompt).toMatch(/default to Kazakh/i);
  });
});
