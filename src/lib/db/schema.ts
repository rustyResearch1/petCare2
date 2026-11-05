import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  doublePrecision,
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
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidAmountCents: integer("paid_amount_cents"),
    stripeSessionId: text("stripe_session_id"),
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
  // Object storage key when a bucket is configured; bytes is the fallback for local development.
  storageKey: text("storage_key"),
  bytes: bytea("bytes"),
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

// ---------- Accounts (Better Auth). Property names are what Better Auth expects. ----------
export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authVerification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Notifications ----------
export type NotificationKind = "received" | "status" | "booked" | "paid" | "team_reply" | "bill_ready" | "task";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(), // recipient; accounts are matched by verified email
    requestId: uuid("request_id").references(() => setupRequests.id, { onDelete: "cascade" }),
    kind: text("kind").$type<NotificationKind>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_email_idx").on(t.email)],
);

// ---------- Bill check ----------
export type BillStatus = "pending" | "done" | "failed";

export type BillFinding = {
  description: string;
  paidCents: number | null;
  typicalLowCents: number | null;
  typicalHighCents: number | null;
  basis: "our_data" | "web" | "clinic_list" | "none";
  cheaperOption: string | null;
  note: string | null;
  sources: { title: string; url: string }[];
};

export type BillReport = {
  summary: string;
  potentialSavingsCents: number;
  findings: BillFinding[];
  nextSteps: string[];
};

export const billChecks = pgTable(
  "bill_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    petName: text("pet_name"),
    clinicName: text("clinic_name"),
    visitDate: text("visit_date"),
    totalCents: integer("total_cents"),
    status: text("status").$type<BillStatus>().notNull().default("pending"),
    report: jsonb("report").$type<BillReport | null>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bill_checks_email_idx").on(t.email)],
);

export const billFiles = pgTable("bill_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  billCheckId: uuid("bill_check_id")
    .notNull()
    .references(() => billChecks.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key"),
  bytes: bytea("bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BillItemCategory = "exam" | "medication" | "vaccine" | "lab" | "imaging" | "procedure" | "dental" | "supply" | "fee" | "other";

// Every line item from every invoice: this table is the price index.
export const billItems = pgTable(
  "bill_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billCheckId: uuid("bill_check_id")
      .notNull()
      .references(() => billChecks.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    normalized: text("normalized").notNull(),
    category: text("category").$type<BillItemCategory>().notNull(),
    quantity: doublePrecision("quantity"),
    unitCents: integer("unit_cents"),
    totalCents: integer("total_cents"),
    clinicName: text("clinic_name"),
    visitDate: text("visit_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bill_items_normalized_idx").on(t.normalized)],
);

// ---------- Assistant and team tasks ----------
export type MessageRole = "user" | "assistant" | "team";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: text("role").$type<MessageRole>().notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_email_idx").on(t.email)],
);

export type TaskKind = "book" | "reschedule" | "records" | "price_check" | "question" | "other";
export type TaskStatus = "open" | "done";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    requestId: uuid("request_id").references(() => setupRequests.id, { onDelete: "set null" }),
    billCheckId: uuid("bill_check_id").references(() => billChecks.id, { onDelete: "set null" }),
    kind: text("kind").$type<TaskKind>().notNull(),
    petName: text("pet_name"),
    details: text("details").notNull(),
    status: text("status").$type<TaskStatus>().notNull().default("open"),
    createdBy: text("created_by").notNull(), // assistant | system | owner
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("tasks_status_idx").on(t.status)],
);

export type Owner = typeof owners.$inferSelect;
export type SetupRequest = typeof setupRequests.$inferSelect;
export type Pet = typeof pets.$inferSelect;
export type PetRecord = typeof petRecords.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type BillCheck = typeof billChecks.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
