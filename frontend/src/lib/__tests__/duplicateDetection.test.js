import { describe, expect, it } from "vitest";
import { findDuplicateEntry } from "../duplicateDetection";

const BASE_EXISTING = {
  id: "entry-1",
  date: "2026-06-06",
  service_type: "Oil change",
  mileage: "180000",
  cost: "45.00",
  receipt_number: "",
};

describe("findDuplicateEntry", () => {
  it("matches by receipt_number when both entries have one, even if date/mileage/cost differ", () => {
    const existing = [{ ...BASE_EXISTING, receipt_number: "No. 4521", date: "2026-06-01", mileage: "179000", cost: "40.00" }];
    const candidate = { receipt_number: "No. 4521", date: "2026-06-06", mileage: "180000", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBe(existing[0]);
  });

  it("does not match on receipt_number when the numbers differ, even with identical date/mileage/cost", () => {
    const existing = [{ ...BASE_EXISTING, receipt_number: "No. 4521" }];
    const candidate = { receipt_number: "No. 9999", date: BASE_EXISTING.date, mileage: BASE_EXISTING.mileage, cost: BASE_EXISTING.cost };

    // Different receipt numbers on both sides means these are genuinely
    // different documents — the date/mileage/cost coincidence must not
    // override an explicit mismatch.
    expect(findDuplicateEntry(candidate, existing)).toBeNull();
  });

  it("falls back to date + mileage + cost when the candidate has no receipt_number", () => {
    const existing = [{ ...BASE_EXISTING }];
    const candidate = { receipt_number: "", date: "2026-06-06", mileage: "180000", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBe(existing[0]);
  });

  it("falls back to date + mileage + cost when the existing entry has no receipt_number", () => {
    const existing = [{ ...BASE_EXISTING, receipt_number: "" }];
    const candidate = { receipt_number: "No. 4521", date: "2026-06-06", mileage: "180000", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBe(existing[0]);
  });

  it("does not flag a match when only date and cost match but mileage differs", () => {
    const existing = [{ ...BASE_EXISTING }];
    const candidate = { receipt_number: "", date: "2026-06-06", mileage: "180500", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBeNull();
  });

  it("does not flag a match when only mileage and cost match but the date differs", () => {
    const existing = [{ ...BASE_EXISTING }];
    const candidate = { receipt_number: "", date: "2026-07-01", mileage: "180000", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBeNull();
  });

  it("returns null when the candidate is missing date, mileage, or cost", () => {
    const existing = [{ ...BASE_EXISTING }];
    expect(findDuplicateEntry({ receipt_number: "", date: "", mileage: "180000", cost: "45.00" }, existing)).toBeNull();
    expect(findDuplicateEntry({ receipt_number: "", date: "2026-06-06", mileage: "", cost: "45.00" }, existing)).toBeNull();
    expect(findDuplicateEntry({ receipt_number: "", date: "2026-06-06", mileage: "180000", cost: "" }, existing)).toBeNull();
  });

  it("returns null against an empty history", () => {
    expect(findDuplicateEntry({ receipt_number: "No. 1", date: "2026-01-01", mileage: "100", cost: "10" }, [])).toBeNull();
  });

  it("treats cost as numeric, so '45.00' and '45' are the same amount", () => {
    const existing = [{ ...BASE_EXISTING, cost: "45" }];
    const candidate = { receipt_number: "", date: "2026-06-06", mileage: "180000", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBe(existing[0]);
  });

  // Regression: mileage used to be compared as an exact string, so a
  // thousands separator or unit suffix from AI extraction (either is
  // possible depending on how the source document phrases it) would make
  // an otherwise-identical mileage fail to match and let a real duplicate
  // through silently.
  it("treats mileage as numeric, ignoring thousands separators and unit suffixes", () => {
    const existing = [{ ...BASE_EXISTING }]; // mileage: "180000"
    expect(findDuplicateEntry({ receipt_number: "", date: "2026-06-06", mileage: "180,000", cost: "45.00" }, existing)).toBe(existing[0]);
    expect(findDuplicateEntry({ receipt_number: "", date: "2026-06-06", mileage: "180000 km", cost: "45.00" }, existing)).toBe(existing[0]);
    expect(findDuplicateEntry({ receipt_number: "", date: "2026-06-06", mileage: "180000 км", cost: "45.00" }, existing)).toBe(existing[0]);
  });

  it("still distinguishes genuinely different mileages after stripping separators/units", () => {
    const existing = [{ ...BASE_EXISTING }]; // mileage: "180000"
    const candidate = { receipt_number: "", date: "2026-06-06", mileage: "185,000 km", cost: "45.00" };

    expect(findDuplicateEntry(candidate, existing)).toBeNull();
  });

  // Regression (real user report): the exact production scenario — a
  // second photo of the same physical receipt where Gemini read the
  // receipt number this time but couldn't on the first upload. One side
  // has a number, the other doesn't; date/mileage/cost all match.
  it("catches the duplicate when only the candidate has a receipt_number and the existing entry has none", () => {
    const existing = [{ ...BASE_EXISTING, receipt_number: null, date: "2025-09-29", mileage: "170741", cost: "11.5" }];
    const candidate = { receipt_number: "35913958189", date: "2025-09-29", mileage: "170741", cost: "11.50" };

    expect(findDuplicateEntry(candidate, existing)).toBe(existing[0]);
  });
});
