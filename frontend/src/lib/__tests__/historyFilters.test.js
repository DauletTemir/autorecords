import { describe, expect, it } from "vitest";
import { filterHistory, parseCost, sumCost } from "../historyFilters";

const history = [
  { date: "2025-01-01", service_type: "Oil change", cost: "45.00" },
  { date: "2025-06-15", service_type: "Oil change", cost: "50.50" },
  { date: "2025-09-01", service_type: "Emissions inspection", cost: "140.32" },
  { date: "", service_type: "Parts", cost: "667" },
  { date: "2026-01-01", service_type: "Registration", cost: "" },
];

describe("parseCost", () => {
  it("parses a plain numeric string", () => {
    expect(parseCost("45.00")).toBe(45);
  });

  it("strips currency symbols and separators", () => {
    expect(parseCost("$1,234.56")).toBeCloseTo(1234.56, 2);
  });

  it("returns null for empty or non-numeric values", () => {
    expect(parseCost("")).toBeNull();
    expect(parseCost(undefined)).toBeNull();
  });
});

describe("filterHistory", () => {
  it("returns everything when no filters are set", () => {
    const result = filterHistory(history, { dateFrom: "", dateTo: "", type: "", costMin: "", costMax: "" });
    expect(result).toHaveLength(5);
  });

  it("filters by dateFrom, keeping entries with no date", () => {
    const result = filterHistory(history, { dateFrom: "2025-06-01", dateTo: "", type: "", costMin: "", costMax: "" });
    expect(result.map((h) => h.service_type)).toEqual(["Oil change", "Emissions inspection", "Parts", "Registration"]);
  });

  it("filters by dateTo, excluding dated entries after it but keeping undated ones", () => {
    const result = filterHistory(history, { dateFrom: "", dateTo: "2025-01-01", type: "", costMin: "", costMax: "" });
    expect(result.map((h) => h.service_type)).toEqual(["Oil change", "Parts"]);
  });

  it("filters by exact service type", () => {
    const result = filterHistory(history, { dateFrom: "", dateTo: "", type: "Oil change", costMin: "", costMax: "" });
    expect(result).toHaveLength(2);
  });

  it("filters by cost range, excluding entries with unparseable cost", () => {
    const result = filterHistory(history, { dateFrom: "", dateTo: "", type: "", costMin: "50", costMax: "200" });
    expect(result.map((h) => h.service_type)).toEqual(["Oil change", "Emissions inspection"]);
  });

  it("combines multiple filters with AND semantics", () => {
    const result = filterHistory(history, { dateFrom: "2025-01-01", dateTo: "2025-12-31", type: "Oil change", costMin: "", costMax: "" });
    expect(result).toHaveLength(2);
  });
});

describe("sumCost", () => {
  it("sums parseable costs and ignores unparseable ones", () => {
    expect(sumCost(history)).toBeCloseTo(45 + 50.5 + 140.32 + 667, 2);
  });

  it("returns 0 for an empty list", () => {
    expect(sumCost([])).toBe(0);
  });
});
