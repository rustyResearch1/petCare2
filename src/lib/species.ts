export const SPECIES = [
  "dog",
  "cat",
  "rabbit",
  "bird",
  "reptile",
  "small_mammal",
  "ferret",
  "other",
] as const;

export type Species = (typeof SPECIES)[number];

export const EXOTIC_SPECIES: ReadonlySet<Species> = new Set([
  "rabbit",
  "bird",
  "reptile",
  "small_mammal",
  "ferret",
  "other",
]);

export const SPECIES_LABEL: Record<Species, string> = {
  dog: "Dog",
  cat: "Cat",
  rabbit: "Rabbit",
  bird: "Bird",
  reptile: "Reptile",
  small_mammal: "Small mammal",
  ferret: "Ferret",
  other: "Other",
};

export function isSpecies(value: unknown): value is Species {
  return typeof value === "string" && (SPECIES as readonly string[]).includes(value);
}

/** What clinics usually ask for at a first visit, per species. Shown on the landing page and the intake form. */
export const FIRST_VISIT_RECORDS: Record<Species, string> = {
  dog: "Rabies certificate and DHPP history. Bordetella too if they board or go to daycare.",
  cat: "Rabies certificate and FVRCP history, plus FeLV status if they go outside.",
  rabbit: "RHDV2 vaccine record and diet notes. Many general clinics don't see rabbits.",
  bird: "Species, age, diet and any past bloodwork. Needs an avian-experienced vet.",
  reptile: "Species, enclosure temperatures and lighting, and diet. Needs a herp-experienced vet.",
  small_mammal: "Species, age, diet and housing. Guinea pigs, rats and chinchillas need exotics care.",
  ferret: "Rabies and canine distemper records. Ferrets usually go to exotics clinics.",
  other: "Whatever records you have. We'll find a clinic that sees them.",
};
