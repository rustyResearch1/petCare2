/** Lowercases and strips punctuation so "Apoquel 16mg, #30" and "APOQUEL 16 MG (30)" group together. */
export function normalizeItem(description: string): string {
  return description
    .toLowerCase()
    .replace(/(\d)\s+(mg|ml|mcg|g|lb|lbs|kg)\b/g, "$1$2")
    .replace(/[#(),.:;*\-_/\\]+/g, " ")
    .replace(/\b(qty|quantity|x)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export type PriceStats = { count: number; lowCents: number; medianCents: number; highCents: number; clinics: number };

/** Groups line items by normalized name and summarizes unit prices. */
export function summarizePrices(
  rows: { normalized: string; unitCents: number | null; totalCents: number | null; clinicName: string | null }[],
): Map<string, PriceStats> {
  const groups = new Map<string, { prices: number[]; clinics: Set<string> }>();
  for (const r of rows) {
    const price = r.unitCents ?? r.totalCents;
    if (price == null || price <= 0) continue;
    const g = groups.get(r.normalized) ?? { prices: [], clinics: new Set<string>() };
    g.prices.push(price);
    if (r.clinicName) g.clinics.add(r.clinicName.toLowerCase());
    groups.set(r.normalized, g);
  }
  const out = new Map<string, PriceStats>();
  for (const [key, g] of groups) {
    const s = [...g.prices].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    out.set(key, {
      count: s.length,
      lowCents: s[0],
      highCents: s[s.length - 1],
      medianCents: s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2),
      clinics: g.clinics.size,
    });
  }
  return out;
}
