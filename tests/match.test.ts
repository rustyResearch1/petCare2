import { describe, expect, it } from "vitest";
import { rankClinics, type MatchClinic, type MatchInput } from "@/lib/match";
import { upcomingVaccines, type PetProfile } from "@/lib/records";

const base: Omit<MatchClinic, "id" | "name" | "neighborhood"> = {
  kind: "general",
  speciesSeen: ["dog", "cat"],
  exotics: false,
  emergency24h: false,
  accepting: "unknown",
  examFeeUsd: null,
  onlineBookingUrl: null,
  ownership: null,
};

const clinics: MatchClinic[] = [
  { ...base, id: "near-dogcat", name: "Near dog/cat", neighborhood: "Outer Sunset" },
  { ...base, id: "far-dogcat", name: "Far dog/cat", neighborhood: "Marina" },
  { ...base, id: "exotics", name: "Exotics", neighborhood: "Mission", speciesSeen: ["dog", "cat", "rabbit", "bird"], exotics: true },
  { ...base, id: "full", name: "Full", neighborhood: "Outer Sunset", accepting: "no" },
  { ...base, id: "er", name: "ER", neighborhood: "Outer Sunset", emergency24h: true },
];

const input = (over: Partial<MatchInput> = {}): MatchInput => ({
  species: "dog",
  ownerNeighborhood: "Ocean Beach",
  travel: "any",
  priority: "closest",
  clinicType: "any",
  ...over,
});

describe("rankClinics", () => {
  it("prefers nearby clinics and resolves neighborhood aliases", () => {
    const r = rankClinics(input(), clinics);
    expect(r[0].clinic.id).toBe("near-dogcat");
    expect(r.find((x) => x.clinic.id === "near-dogcat")!.distanceKm).toBe(0);
  });

  it("excludes clinics that are not accepting new patients and lists them last", () => {
    const r = rankClinics(input(), clinics);
    const full = r.find((x) => x.clinic.id === "full")!;
    expect(full.excluded).toMatch(/Not accepting/);
    expect(r[r.length - 1].excluded).not.toBeNull();
  });

  it("only offers exotics-capable clinics for a rabbit", () => {
    const r = rankClinics(input({ species: "rabbit" }), clinics);
    const eligible = r.filter((x) => !x.excluded).map((x) => x.clinic.id);
    expect(eligible).toEqual(["exotics"]);
  });

  it("ranks an ER hospital below a regular clinic in the same neighborhood", () => {
    const r = rankClinics(input(), clinics).filter((x) => !x.excluded).map((x) => x.clinic.id);
    expect(r.indexOf("er")).toBeGreaterThan(r.indexOf("near-dogcat"));
  });

  it("rewards accepting status and online booking", () => {
    const pair: MatchClinic[] = [
      { ...base, id: "a", name: "A", neighborhood: "Mission" },
      { ...base, id: "b", name: "B", neighborhood: "Mission", accepting: "yes", onlineBookingUrl: "https://example.com" },
    ];
    expect(rankClinics(input({ ownerNeighborhood: "Mission", priority: "soonest" }), pair)[0].clinic.id).toBe("b");
  });
});

describe("clinic kinds and messy neighborhoods", () => {
  it("excludes vaccine-only, specialty, ER-only and closed clinics", () => {
    const list: MatchClinic[] = [
      { ...base, id: "vax", name: "Vax", neighborhood: "Outer Sunset", kind: "vaccine_clinic" },
      { ...base, id: "spec", name: "Spec", neighborhood: "Outer Sunset", kind: "specialty" },
      { ...base, id: "er", name: "ER", neighborhood: "Outer Sunset", kind: "emergency" },
      { ...base, id: "closed", name: "Closed", neighborhood: "Outer Sunset", kind: "closed" },
      { ...base, id: "gp", name: "GP", neighborhood: "Outer Sunset" },
    ];
    expect(rankClinics(input(), list).filter((x) => !x.excluded).map((x) => x.clinic.id)).toEqual(["gp"]);
  });

  it("parses free-text neighborhoods", () => {
    const list: MatchClinic[] = [{ ...base, id: "m", name: "M", neighborhood: "Mission / Potrero Hill border" }];
    expect(rankClinics(input({ ownerNeighborhood: "Mission" }), list)[0].distanceKm).toBe(0);
  });

  it("puts a farther confirmed exotics clinic above a nearby unconfirmed one for a rabbit", () => {
    const list: MatchClinic[] = [
      { ...base, id: "near-unknown", name: "Near", neighborhood: "Outer Sunset", speciesSeen: [], exotics: null },
      { ...base, id: "far-exotics", name: "Far", neighborhood: "Pacific Heights", speciesSeen: ["rabbit", "bird"], exotics: true },
    ];
    expect(rankClinics(input({ species: "rabbit", travel: "car" }), list)[0].clinic.id).toBe("far-exotics");
  });

  it("treats house calls as distance-free", () => {
    const list: MatchClinic[] = [{ ...base, id: "hc", name: "HC", neighborhood: "Citywide (house calls)", kind: "house_call" }];
    const r = rankClinics(input({ travel: "walk" }), list)[0];
    expect(r.distanceKm).toBeNull();
    expect(r.reasons).toContain("Comes to your home");
  });
});

describe("upcomingVaccines", () => {
  const profile = {
    vaccines: [
      { name: "Rabies 3yr", given_on: "2024-01-10", next_due: "2027-01-10", notes: null },
      { name: "DHPP", given_on: "2025-10-01", next_due: "2026-10-01", notes: null },
      { name: "Bordetella", given_on: null, next_due: "2026-11-20", notes: null },
    ],
  } as PetProfile;

  it("returns overdue and soon-due vaccines in date order", () => {
    const due = upcomingVaccines(profile, new Date("2026-11-01"), 60);
    expect(due.map((v) => v.name)).toEqual(["DHPP", "Bordetella"]);
    expect(due[0].overdue).toBe(true);
    expect(due[1].overdue).toBe(false);
  });
});
