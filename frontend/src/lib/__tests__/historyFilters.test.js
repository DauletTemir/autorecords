import { describe, expect, it } from "vitest";
import { filterHistory, parseCost, recentActivity, sortHistory, sumCost } from "../historyFilters";

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

describe("sortHistory", () => {
  it("sorts by date descending by default (most recent first)", () => {
    const result = sortHistory(history);
    expect(result.filter((h) => h.date).map((h) => h.date)).toEqual([
      "2026-01-01", "2025-09-01", "2025-06-15", "2025-01-01",
    ]);
  });

  it("sorts by date ascending when asked", () => {
    const result = sortHistory(history, "asc");
    expect(result.filter((h) => h.date).map((h) => h.date)).toEqual([
      "2025-01-01", "2025-06-15", "2025-09-01", "2026-01-01",
    ]);
  });

  it("always places undated entries at the end, regardless of direction", () => {
    const desc = sortHistory(history, "desc");
    const asc = sortHistory(history, "asc");
    expect(desc[desc.length - 1].service_type).toBe("Parts");
    expect(asc[asc.length - 1].service_type).toBe("Parts");
  });

  it("does not mutate the input array", () => {
    const copy = [...history];
    sortHistory(history, "asc");
    expect(history).toEqual(copy);
  });

  it("returns an empty array unchanged", () => {
    expect(sortHistory([], "desc")).toEqual([]);
  });
});

describe("recentActivity", () => {
  const carA = { vin: "VIN-A", brand: "Kia", model: "Sportage" };
  const carB = { vin: "VIN-B", brand: "Ford", model: "F-150" };

  const vehicles = [
    {
      ...carA,
      history: [
        { id: "a1", service_type: "Oil change", updated_at: "2026-09-01T10:00:00Z" },
        { id: "a2", service_type: "Spark plugs", updated_at: "2026-09-05T10:00:00Z" },
      ],
    },
    {
      ...carB,
      history: [
        { id: "b1", service_type: "Tire rotation", updated_at: "2026-09-10T10:00:00Z" },
      ],
    },
  ];

  it("returns entries from every vehicle, newest updated_at first", () => {
    const result = recentActivity(vehicles);
    expect(result.map((h) => h.id)).toEqual(["b1", "a2", "a1"]);
  });

  it("attaches the owning vehicle to each entry", () => {
    const result = recentActivity(vehicles);
    expect(result[0].vehicle.vin).toBe("VIN-B");
    expect(result[1].vehicle.vin).toBe("VIN-A");
  });

  it("respects a custom limit", () => {
    expect(recentActivity(vehicles, 1)).toHaveLength(1);
    expect(recentActivity(vehicles, 10)).toHaveLength(3);
  });

  it("excludes entries with no updated_at instead of sorting them unpredictably", () => {
    const withMissing = [
      { ...carA, history: [{ id: "no-timestamp", service_type: "Oil change" }] },
      { ...carB, history: [{ id: "b1", service_type: "Tire rotation", updated_at: "2026-09-10T10:00:00Z" }] },
    ];
    const result = recentActivity(withMissing);
    expect(result.map((h) => h.id)).toEqual(["b1"]);
  });

  it("returns an empty array when no vehicle has any history", () => {
    expect(recentActivity([{ ...carA, history: [] }])).toEqual([]);
  });

  it("defaults to a limit of 3", () => {
    const manyEntries = {
      ...carA,
      history: Array.from({ length: 5 }, (_, i) => ({
        id: `e${i}`,
        updated_at: `2026-09-0${i + 1}T10:00:00Z`,
      })),
    };
    expect(recentActivity([manyEntries])).toHaveLength(3);
  });
});
