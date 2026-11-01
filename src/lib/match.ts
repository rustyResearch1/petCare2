import { EXOTIC_SPECIES, isSpecies, type Species } from "./species";
import { distanceKm, findNeighborhood } from "./neighborhoods";

export type MatchClinic = {
  id: string;
  name: string;
  neighborhood: string | null;
  speciesSeen: string[];
  exotics: boolean | null;
  emergency24h: boolean | null;
  accepting: "yes" | "no" | "unknown";
  examFeeUsd: number | null;
  onlineBookingUrl: string | null;
  ownership: string | null;
};

export type MatchInput = {
  species: string;
  ownerNeighborhood: string;
  travel: "walk" | "transit" | "car" | "any";
  priority: "closest" | "soonest" | "lowest_fee";
  clinicType: "any" | "independent";
};

export type RankedClinic = {
  clinic: MatchClinic;
  score: number;
  distanceKm: number | null;
  reasons: string[];
  /** Hard blockers. Excluded clinics are returned last so ops can see why. */
  excluded: string | null;
};

// How far is comfortable for each way of getting there (km).
const COMFORT_KM: Record<MatchInput["travel"], number> = { walk: 1.5, transit: 5, car: 10, any: 6 };

function seesSpecies(c: MatchClinic, species: Species): "yes" | "no" | "unknown" {
  const seen = new Set(c.speciesSeen.map((s) => s.toLowerCase()));
  if (seen.has(species)) return "yes";
  if (EXOTIC_SPECIES.has(species)) {
    if (c.exotics === true) return "yes";
    if (c.exotics === false) return "no";
    // A clinic that lists species but not this one almost certainly doesn't see it.
    return seen.size > 0 ? "no" : "unknown";
  }
  return seen.size > 0 ? "no" : "unknown";
}

export function rankClinics(input: MatchInput, clinics: MatchClinic[]): RankedClinic[] {
  const species: Species = isSpecies(input.species) ? input.species : "other";
  const home = findNeighborhood(input.ownerNeighborhood);
  const comfort = COMFORT_KM[input.travel];

  const ranked = clinics.map((clinic): RankedClinic => {
    const reasons: string[] = [];
    let excluded: string | null = null;
    let score = 50;

    const sees = seesSpecies(clinic, species);
    if (sees === "no") excluded = `Doesn't list ${species.replace("_", " ")}s`;
    else if (sees === "yes") {
      score += EXOTIC_SPECIES.has(species) ? 25 : 10;
      reasons.push(`Sees ${species.replace("_", " ")}s`);
    } else {
      score -= 10;
      reasons.push("Species list not confirmed");
    }

    if (clinic.accepting === "no") excluded ??= "Not accepting new patients";
    else if (clinic.accepting === "yes") {
      score += 30;
      reasons.push("Accepting new patients");
    } else reasons.push("New-patient status unknown");

    const place = findNeighborhood(clinic.neighborhood);
    let km: number | null = null;
    if (home && place) {
      km = Math.round(distanceKm(home, place) * 10) / 10;
      const weight = input.priority === "closest" ? 8 : 4;
      score -= km * weight;
      if (km > comfort) score -= (km - comfort) * weight * 2;
      reasons.push(km < 0.5 ? "In your neighborhood" : `About ${km} km away`);
    } else {
      score -= 8;
    }

    if (clinic.examFeeUsd != null) {
      const feeWeight = input.priority === "lowest_fee" ? 0.4 : 0.1;
      score -= Math.max(0, clinic.examFeeUsd - 70) * feeWeight;
      reasons.push(`Exam about $${clinic.examFeeUsd}`);
    }

    if (clinic.onlineBookingUrl) {
      score += input.priority === "soonest" ? 12 : 5;
      reasons.push("Books online");
    }

    if (clinic.emergency24h) {
      // ER hospitals are a poor home for routine care; keep them visible but lower.
      score -= 20;
      reasons.push("24-hour emergency hospital");
    }

    if (input.clinicType === "independent") {
      const own = (clinic.ownership ?? "").toLowerCase();
      if (own === "independent") {
        score += 10;
        reasons.push("Independently owned");
      } else if (own && own !== "independent") score -= 15;
    }

    return { clinic, score: Math.round(score), distanceKm: km, reasons, excluded };
  });

  return ranked.sort((a, b) => {
    if (!!a.excluded !== !!b.excluded) return a.excluded ? 1 : -1;
    return b.score - a.score;
  });
}
