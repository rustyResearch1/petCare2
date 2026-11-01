import { parse } from "csv-parse/sync";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import { SPECIES } from "./species";
import { CLINIC_KINDS, type ClinicKind } from "./db/schema";

type Row = Record<string, string | undefined>;

const bool = (v?: string) => {
  const s = (v ?? "").trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return null;
};
const str = (v?: string) => {
  const s = (v ?? "").trim();
  return s ? s : null;
};
const species = (v?: string) =>
  (v ?? "")
    .split(/[;,|]/)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((s) => (SPECIES as readonly string[]).includes(s));
const accepting = (v?: string): schema.Accepting => {
  const b = bool(v);
  return b === true ? "yes" : b === false ? "no" : "unknown";
};

/**
 * Upserts clinics from CSV keyed on (name, address).
 * Columns: name, neighborhood, address, phone, website, species_seen, exotics, emergency_24h,
 * kind (general | house_call | vaccine_clinic | specialty | emergency | closed),
 * online_booking_url, booking_method, new_patient_form_url, ownership, source_url, notes,
 * and optionally accepting, exam_fee_usd.
 */
export async function importClinicsCsv(db: NodePgDatabase<typeof schema>, csv: string) {
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as Row[];
  let inserted = 0;
  let updated = 0;
  const skipped: string[] = [];
  for (const r of rows) {
    const name = str(r.name);
    if (!name) {
      skipped.push("(row without a name)");
      continue;
    }
    const address = str(r.address);
    const values = {
      name,
      neighborhood: str(r.neighborhood),
      kind: (CLINIC_KINDS as string[]).includes((r.kind ?? "").trim()) ? ((r.kind as string).trim() as ClinicKind) : "general",
      address,
      phone: str(r.phone),
      website: str(r.website),
      speciesSeen: species(r.species_seen),
      exotics: bool(r.exotics),
      emergency24h: bool(r.emergency_24h),
      onlineBookingUrl: str(r.online_booking_url),
      bookingMethod: str(r.booking_method),
      newPatientFormUrl: str(r.new_patient_form_url),
      ownership: str(r.ownership),
      sourceUrl: str(r.source_url),
      notes: str(r.notes),
      updatedAt: new Date(),
      ...(r.accepting !== undefined && str(r.accepting) ? { accepting: accepting(r.accepting), acceptingCheckedAt: new Date() } : {}),
      ...(r.exam_fee_usd && Number.isFinite(Number(r.exam_fee_usd)) ? { examFeeUsd: Math.round(Number(r.exam_fee_usd)) } : {}),
    };
    const where = and(
      eq(schema.clinics.name, name),
      address ? eq(schema.clinics.address, address) : isNull(schema.clinics.address),
    );
    const [existing] = await db.select({ id: schema.clinics.id }).from(schema.clinics).where(where);
    if (existing) {
      await db.update(schema.clinics).set(values).where(eq(schema.clinics.id, existing.id));
      updated++;
    } else {
      await db.insert(schema.clinics).values(values);
      inserted++;
    }
  }
  return { inserted, updated, skipped };
}
