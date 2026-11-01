import { z } from "zod";

/** Structured pet history read from uploaded records. Every field is optional because records vary wildly. */
export const PetProfileSchema = z.object({
  species: z.string().nullable(),
  breed: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  sex: z.string().nullable(),
  spayed_neutered: z.boolean().nullable(),
  microchip: z.string().nullable(),
  weight: z
    .object({ value: z.number(), unit: z.string(), measured_on: z.string().nullable() })
    .nullable(),
  vaccines: z.array(
    z.object({
      name: z.string(),
      given_on: z.string().nullable(),
      next_due: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
  medications: z.array(
    z.object({ name: z.string(), dose: z.string().nullable(), frequency: z.string().nullable() }),
  ),
  conditions: z.array(z.string()),
  allergies: z.array(z.string()),
  last_exam_on: z.string().nullable(),
  previous_clinic: z.string().nullable(),
  summary: z.string(),
  unreadable_or_missing: z.array(z.string()),
});

export type PetProfile = z.infer<typeof PetProfileSchema>;

// Hand-written JSON Schema for Claude structured outputs (output_config.format).
const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
export const PET_PROFILE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "species",
    "breed",
    "date_of_birth",
    "sex",
    "spayed_neutered",
    "microchip",
    "weight",
    "vaccines",
    "medications",
    "conditions",
    "allergies",
    "last_exam_on",
    "previous_clinic",
    "summary",
    "unreadable_or_missing",
  ],
  properties: {
    species: nullableString,
    breed: nullableString,
    date_of_birth: { ...nullableString, description: "YYYY-MM-DD, or YYYY-MM if day unknown" },
    sex: nullableString,
    spayed_neutered: { anyOf: [{ type: "boolean" }, { type: "null" }] },
    microchip: nullableString,
    weight: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["value", "unit", "measured_on"],
          properties: { value: { type: "number" }, unit: { type: "string" }, measured_on: nullableString },
        },
      ],
    },
    vaccines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "given_on", "next_due", "notes"],
        properties: {
          name: { type: "string", description: "As written, e.g. Rabies 3yr, DHPP, FVRCP, RHDV2" },
          given_on: { ...nullableString, description: "YYYY-MM-DD" },
          next_due: { ...nullableString, description: "YYYY-MM-DD" },
          notes: nullableString,
        },
      },
    },
    medications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "dose", "frequency"],
        properties: { name: { type: "string" }, dose: nullableString, frequency: nullableString },
      },
    },
    conditions: { type: "array", items: { type: "string" } },
    allergies: { type: "array", items: { type: "string" } },
    last_exam_on: { ...nullableString, description: "YYYY-MM-DD" },
    previous_clinic: nullableString,
    summary: { type: "string", description: "Two or three plain sentences a front desk can read." },
    unreadable_or_missing: {
      type: "array",
      items: { type: "string" },
      description: "Anything illegible, cut off, or that a new clinic will likely ask for but is absent.",
    },
  },
} as const;

export const SUPPORTED_RECORD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type SupportedRecordType = (typeof SUPPORTED_RECORD_TYPES)[number];
export const MAX_RECORD_BYTES = 10 * 1024 * 1024;
export const MAX_RECORDS_PER_PET = 6;

export function isSupportedRecordType(t: string): t is SupportedRecordType {
  return (SUPPORTED_RECORD_TYPES as readonly string[]).includes(t);
}

/** Vaccines whose next_due falls within `days` of `today` (or is already past), soonest first. */
export function upcomingVaccines(profile: PetProfile | null | undefined, today: Date, days = 60) {
  if (!profile) return [];
  const limit = new Date(today.getTime() + days * 86_400_000);
  return profile.vaccines
    .filter((v) => v.next_due && !Number.isNaN(Date.parse(v.next_due)))
    .map((v) => ({ ...v, due: new Date(v.next_due as string) }))
    .filter((v) => v.due <= limit)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map((v) => ({ ...v, overdue: v.due < today }));
}
