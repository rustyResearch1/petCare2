import { z } from "zod";
import { SPECIES } from "./species";

export const MAX_PETS = 4;

export const PetInput = z.object({
  name: z.string().trim().min(1, "Add your pet's name").max(60),
  species: z.enum(SPECIES),
  speciesOther: z.string().trim().max(60).optional().default(""),
  breed: z.string().trim().max(80).optional().default(""),
  age: z.string().trim().max(40).optional().default(""),
  sex: z.enum(["female", "male", "unknown"]).default("unknown"),
  fixed: z.enum(["yes", "no", "unknown"]).default("unknown"),
  medications: z.string().trim().max(1000).optional().default(""),
  conditions: z.string().trim().max(1000).optional().default(""),
  insurer: z.string().trim().max(80).optional().default(""),
});

export const IntakeInput = z.object({
  owner: z.object({
    name: z.string().trim().min(1, "Add your name").max(80),
    email: z.email("Enter an email we can reach you at").max(120),
    phone: z.string().trim().max(30).optional().default(""),
    neighborhood: z.string().trim().min(1, "Pick your neighborhood").max(60),
    moveStatus: z.enum(["moved", "moving"]),
    moveDate: z.string().trim().max(20).optional().default(""),
    referral: z.string().trim().max(120).optional().default(""),
  }),
  pets: z.array(PetInput).min(1, "Add at least one pet").max(MAX_PETS),
  preferences: z.object({
    times: z.array(z.enum(["weekday_morning", "weekday_evening", "weekend"])).default([]),
    travel: z.enum(["walk", "transit", "car", "any"]).default("any"),
    priority: z.enum(["closest", "soonest", "lowest_fee"]).default("closest"),
    clinicType: z.enum(["any", "independent"]).default("any"),
    notes: z.string().trim().max(1500).optional().default(""),
  }),
  consent: z.literal(true, { error: "Please confirm so we can contact clinics for you" }),
  // Honeypot: real people never fill this.
  website: z.string().max(0).optional().default(""),
});

export type IntakeInput = z.infer<typeof IntakeInput>;

export const TIME_LABEL: Record<string, string> = {
  weekday_morning: "Weekday mornings",
  weekday_evening: "Weekday evenings",
  weekend: "Weekends",
};
export const TRAVEL_LABEL: Record<string, string> = {
  walk: "Walking",
  transit: "Muni or BART",
  car: "Driving",
  any: "Any way",
};
export const PRIORITY_LABEL: Record<string, string> = {
  closest: "Closest clinic",
  soonest: "Soonest appointment",
  lowest_fee: "Lowest exam fee",
};
