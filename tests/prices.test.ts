import { describe, expect, it } from "vitest";
import { normalizeItem, summarizePrices } from "@/lib/prices";

describe("normalizeItem", () => {
  it("groups the same drug written different ways", () => {
    expect(normalizeItem("Apoquel 16mg, #30")).toBe(normalizeItem("APOQUEL 16 MG (30)"));
  });
  it("keeps strength so different doses stay separate", () => {
    expect(normalizeItem("Apoquel 16mg")).not.toBe(normalizeItem("Apoquel 5.4mg"));
  });
});

describe("summarizePrices", () => {
  it("computes low, median, high and clinic count", () => {
    const stats = summarizePrices([
      { normalized: "wellness exam", unitCents: 8000, totalCents: 8000, clinicName: "A" },
      { normalized: "wellness exam", unitCents: 9500, totalCents: 9500, clinicName: "B" },
      { normalized: "wellness exam", unitCents: 12000, totalCents: 12000, clinicName: "b" },
      { normalized: "wellness exam", unitCents: null, totalCents: null, clinicName: "C" },
    ]).get("wellness exam")!;
    expect(stats).toEqual({ count: 3, lowCents: 8000, medianCents: 9500, highCents: 12000, clinics: 2 });
  });
  it("falls back to the line total when there is no unit price", () => {
    const stats = summarizePrices([{ normalized: "x", unitCents: null, totalCents: 4200, clinicName: null }]).get("x")!;
    expect(stats.medianCents).toBe(4200);
  });
});
