import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  jsonb,
  customType,
  index,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
});

export type RequestStatus = "new" | "shortlisting" | "contacting" | "booked" | "done" | "cancelled";
export const REQUEST_STATUSES: RequestStatus[] = [
  "new",
  "shortlisting",
  "contacting",
  "booked",
  "done",
  "cancelled",
];

export type Preferences = {
  times: string[]; // weekday_morning | weekday_evening | weekend
  travel: "walk" | "transit" | "car" | "any";
  priority: "closest" | "soonest" | "lowest_fee";
  clinicType: "any" | "independent";
  notes?: string;
};

export type Appointment = { clinicId: string; at: string; notes?: string };

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  neighborhood: text("neighborhood").notNull(),
  moveStatus: text("move_status").notNull(), // moved | moving
  moveDate: text("move_date"),
  referral: text("referral"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const setupRequests = pgTable(
  "setup_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    status: text("status").$type<RequestStatus>().notNull().default("new"),
    preferences: jsonb("preferences").$type<Preferences>().notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    appointment: jsonb("appointment").$type<Appointment | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("setup_requests_status_idx").on(t.status)],
);

export type ExtractionStatus = "none" | "pending" | "done" | "failed" | "skipped";

export const pets = pgTable("pets", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => setupRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").notNull(),
  speciesOther: text("species_other"),
  breed: text("breed"),
  age: text("age"),
  sex: text("sex"),
  fixed: text("fixed"), // yes | no | unknown
  medications: text("medications"),
  conditions: text("conditions"),
  insurer: text("insurer"),
  profile: jsonb("profile").$type<import("../records").PetProfile | null>(),
  extractionStatus: text("extraction_status").$type<ExtractionStatus>().notNull().default("none"),
  extractionError: text("extraction_error"),
});

export const petRecords = pgTable("pet_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  petId: uuid("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Accepting = "yes" | "no" | "unknown";
export type ClinicKind = "general" | "house_call" | "vaccine_clinic" | "specialty" | "emergency" | "closed";
export const CLINIC_KINDS: ClinicKind[] = ["general", "house_call", "vaccine_clinic", "specialty", "emergency", "closed"];

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  neighborhood: text("neighborhood"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  kind: text("kind").$type<ClinicKind>().notNull().default("general"),
  speciesSeen: text("species_seen").array().notNull().default([]),
  exotics: boolean("exotics"),
  emergency24h: boolean("emergency_24h"),
  onlineBookingUrl: text("online_booking_url"),
  bookingMethod: text("booking_method"),
  newPatientFormUrl: text("new_patient_form_url"),
  ownership: text("ownership"),
  accepting: text("accepting").$type<Accepting>().notNull().default("unknown"),
  acceptingCheckedAt: timestamp("accepting_checked_at", { withTimezone: true }),
  examFeeUsd: integer("exam_fee_usd"),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityKind = "note" | "call" | "email" | "form" | "status" | "system";

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => setupRequests.id, { onDelete: "cascade" }),
    clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "set null" }),
    kind: text("kind").$type<ActivityKind>().notNull(),
    body: text("body").notNull(),
    minutes: integer("minutes"), // founder time spent, to track manual effort per setup
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_request_idx").on(t.requestId)],
);

export type Owner = typeof owners.$inferSelect;
export type SetupRequest = typeof setupRequests.$inferSelect;
export type Pet = typeof pets.$inferSelect;
export type PetRecord = typeof petRecords.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Activity = typeof activity.$inferSelect;
