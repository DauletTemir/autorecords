export function parseCost(raw) {
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

export function filterHistory(history, f) {
  return history.filter((h) => {
    if (f.dateFrom && h.date && h.date < f.dateFrom) return false;
    if (f.dateTo && h.date && h.date > f.dateTo) return false;
    if (f.type && h.service_type !== f.type) return false;
    const cost = parseCost(h.cost);
    if (f.costMin && !(cost >= parseFloat(f.costMin))) return false;
    if (f.costMax && !(cost <= parseFloat(f.costMax))) return false;
    return true;
  });
}

export function sumCost(entries) {
  return entries.reduce((s, h) => s + (parseCost(h.cost) ?? 0), 0);
}

// Sorts by date; entries with a missing/empty date always sort to the end,
// regardless of direction, since there's no chronological position to put
// them in (matches the existing t("unknown") treatment of empty dates
// elsewhere in the UI — undated entries are shown, but not ranked).
export function sortHistory(entries, direction = "desc") {
  const withDate = entries.filter((h) => h.date);
  const withoutDate = entries.filter((h) => !h.date);

  const sorted = [...withDate].sort((a, b) =>
    direction === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  );

  return [...sorted, ...withoutDate];
}
