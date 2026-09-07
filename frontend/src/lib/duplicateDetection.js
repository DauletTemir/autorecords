import { parseCost } from "./historyFilters";

// Detects whether a newly AI-extracted entry looks like it's the same
// real-world receipt as one already saved for this vehicle — e.g. the user
// re-uploaded the same document (a clearer retake, or they forgot they'd
// already added it).
//
// receipt_number, when present on both sides, is the most reliable signal:
// it's the document's own printed ID, unlikely to coincidentally match
// across two genuinely different service visits. When either entry lacks
// a receipt_number, fall back to matching on date + mileage + cost
// together — any one of those alone is too common to be meaningful (many
// oil changes cost the same), but all three matching at once is a strong
// signal of the same receipt.
export function findDuplicateEntry(candidate, existingEntries) {
  const candidateReceiptNumber = normalize(candidate.receipt_number);

  if (candidateReceiptNumber) {
    const withReceiptNumber = existingEntries.filter((e) => normalize(e.receipt_number));
    // Both sides have an explicit number — trust it completely. A match
    // confirms the duplicate; entries that HAVE a number but a different
    // one are confirmed genuinely different documents, so they must not
    // fall through to the looser date/mileage/cost heuristic below (that
    // heuristic is only for when we lack the stronger signal, not for
    // overriding it).
    if (withReceiptNumber.length > 0) {
      return withReceiptNumber.find((e) => normalize(e.receipt_number) === candidateReceiptNumber) ?? null;
    }
  }

  const candidateDate = normalize(candidate.date);
  const candidateMileage = normalize(candidate.mileage);
  const candidateCost = parseCost(candidate.cost);

  if (!candidateDate || !candidateMileage || candidateCost === null) return null;

  return (
    existingEntries.find((e) => {
      if (normalize(e.receipt_number)) return false; // has a number but candidate doesn't — not comparable, skip
      if (normalize(e.date) !== candidateDate) return false;
      if (normalize(e.mileage) !== candidateMileage) return false;
      return parseCost(e.cost) === candidateCost;
    }) ?? null
  );
}

function normalize(value) {
  return (value ?? "").toString().trim();
}
