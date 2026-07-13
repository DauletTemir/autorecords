import { describe, expect, it } from "vitest";
import { extractJson } from "../gemini.js";

describe("extractJson", () => {
  it("parses a clean JSON object", () => {
    const text = '{"vin":"1HGCM82633A123456","brand":"Honda","model":"Accord","year":"2018","plate":"","date":"2026-01-01","service_type":"Oil change","description":"","mileage":"50000","cost":"45.00","comment":""}';
    const result = extractJson(text);
    expect(result.vin).toBe("1HGCM82633A123456");
    expect(result.brand).toBe("Honda");
    expect(result.cost).toBe("45.00");
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
