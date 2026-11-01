// Approximate centroids for San Francisco neighborhoods. Good enough to rank clinics by
// rough distance; swap for geocoded addresses once clinic coordinates are stored.
export type Neighborhood = { name: string; lat: number; lng: number; aliases?: string[] };

export const NEIGHBORHOODS: Neighborhood[] = [
  { name: "Bayview", lat: 37.73, lng: -122.388, aliases: ["bayview-hunters point", "hunters point"] },
  { name: "Bernal Heights", lat: 37.741, lng: -122.415, aliases: ["bernal"] },
  { name: "Castro", lat: 37.761, lng: -122.435, aliases: ["eureka valley", "duboce triangle"] },
  { name: "Chinatown", lat: 37.794, lng: -122.407 },
  { name: "Cole Valley", lat: 37.765, lng: -122.45 },
  { name: "Cow Hollow", lat: 37.797, lng: -122.436 },
  { name: "Diamond Heights", lat: 37.742, lng: -122.443 },
  { name: "Dogpatch", lat: 37.76, lng: -122.389 },
  { name: "Excelsior", lat: 37.724, lng: -122.43 },
  { name: "Financial District", lat: 37.794, lng: -122.4, aliases: ["fidi", "embarcadero"] },
  { name: "Forest Hill", lat: 37.748, lng: -122.463 },
  { name: "Glen Park", lat: 37.734, lng: -122.433 },
  { name: "Haight-Ashbury", lat: 37.77, lng: -122.447, aliases: ["haight", "upper haight"] },
  { name: "Hayes Valley", lat: 37.776, lng: -122.424 },
  { name: "Ingleside", lat: 37.722, lng: -122.455, aliases: ["oceanview", "ocean view"] },
  { name: "Inner Richmond", lat: 37.78, lng: -122.465, aliases: ["richmond", "laurel heights", "lone mountain"] },
  { name: "Inner Sunset", lat: 37.76, lng: -122.466, aliases: ["sunset"] },
  { name: "Japantown", lat: 37.785, lng: -122.43 },
  { name: "Lakeshore", lat: 37.725, lng: -122.48, aliases: ["stonestown", "lake merced", "park merced"] },
  { name: "Lower Haight", lat: 37.772, lng: -122.431 },
  { name: "Marina", lat: 37.802, lng: -122.437 },
  { name: "Mission", lat: 37.76, lng: -122.415, aliases: ["mission district", "inner mission"] },
  { name: "Mission Bay", lat: 37.77, lng: -122.392 },
  { name: "Nob Hill", lat: 37.793, lng: -122.416 },
  { name: "Noe Valley", lat: 37.75, lng: -122.433 },
  { name: "NoPa", lat: 37.779, lng: -122.441, aliases: ["north of panhandle", "western addition", "alamo square"] },
  { name: "North Beach", lat: 37.8, lng: -122.41, aliases: ["telegraph hill"] },
  { name: "Outer Mission", lat: 37.72, lng: -122.445 },
  { name: "Outer Richmond", lat: 37.777, lng: -122.497, aliases: ["sea cliff"] },
  { name: "Outer Sunset", lat: 37.755, lng: -122.495, aliases: ["ocean beach", "central sunset"] },
  { name: "Pacific Heights", lat: 37.792, lng: -122.435, aliases: ["lower pacific heights", "presidio heights"] },
  { name: "Parkside", lat: 37.742, lng: -122.489 },
  { name: "Potrero Hill", lat: 37.759, lng: -122.4, aliases: ["potrero"] },
  { name: "Russian Hill", lat: 37.801, lng: -122.419 },
  { name: "SoMa", lat: 37.778, lng: -122.405, aliases: ["south of market", "south beach", "rincon hill"] },
  { name: "Tenderloin", lat: 37.784, lng: -122.414, aliases: ["civic center", "union square"] },
  { name: "Twin Peaks", lat: 37.752, lng: -122.447 },
  { name: "Visitacion Valley", lat: 37.714, lng: -122.409 },
  { name: "West Portal", lat: 37.741, lng: -122.466, aliases: ["st. francis wood", "miraloma park"] },
];

const BY_KEY = new Map<string, Neighborhood>();
for (const n of NEIGHBORHOODS) {
  BY_KEY.set(normalize(n.name), n);
  for (const a of n.aliases ?? []) BY_KEY.set(normalize(a), n);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findNeighborhood(name: string | null | undefined): Neighborhood | undefined {
  if (!name) return undefined;
  return BY_KEY.get(normalize(name));
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
