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
