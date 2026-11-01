"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { REQUEST_STATUSES, type RequestStatus, type ActivityKind } from "@/lib/db/schema";
import { runExtraction } from "@/lib/jobs";
import { importClinicsCsv } from "@/lib/clinic-import";
import { sfLocalToIso, formatSf } from "@/lib/time";

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "New",
  shortlisting: "Shortlisting",
  contacting: "Contacting clinics",
  booked: "Booked",
  done: "Done",
  cancelled: "Cancelled",
};

async function touch(requestId: string) {
  const db = await getDb();
  await db.update(schema.setupRequests).set({ updatedAt: new Date() }).where(eq(schema.setupRequests.id, requestId));
  revalidatePath(`/ops/r/${requestId}`);
  revalidatePath("/ops");
}

export async function setStatus(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  const status = String(formData.get("status")) as RequestStatus;
  if (!REQUEST_STATUSES.includes(status)) return;
  const db = await getDb();
  await db.update(schema.setupRequests).set({ status }).where(eq(schema.setupRequests.id, requestId));
  await db.insert(schema.activity).values({ requestId, kind: "status", body: `Status: ${STATUS_LABEL[status]}` });
  await touch(requestId);
}

export async function logActivity(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  const clinicId = String(formData.get("clinicId") ?? "") || null;
  const kind = (String(formData.get("kind") ?? "note") || "note") as ActivityKind;
  const outcome = String(formData.get("outcome") ?? "");
  const minutes = Number(formData.get("minutes") ?? 0) || null;
  let body = String(formData.get("body") ?? "").trim();
  const db = await getDb();

  if (clinicId && outcome) {
    const accepting = outcome === "accepting" ? "yes" : outcome === "not_accepting" ? "no" : null;
    const [clinic] = await db.select({ name: schema.clinics.name }).from(schema.clinics).where(eq(schema.clinics.id, clinicId));
    const outcomeText =
      outcome === "accepting" ? "taking new patients" : outcome === "not_accepting" ? "not taking new patients" : "no answer";
    body = `${clinic?.name ?? "Clinic"}: ${outcomeText}${body ? `. ${body}` : ""}`;
    if (accepting) {
      await db
        .update(schema.clinics)
        .set({ accepting, acceptingCheckedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.clinics.id, clinicId));
      revalidatePath("/ops/clinics");
    }
    const fee = Number(formData.get("examFee") ?? "");
    if (Number.isFinite(fee) && fee > 0) {
      await db.update(schema.clinics).set({ examFeeUsd: Math.round(fee) }).where(eq(schema.clinics.id, clinicId));
    }
  }
  if (!body) return;
  await db.insert(schema.activity).values({ requestId, clinicId, kind, body, minutes });
  await touch(requestId);
}

export async function bookAppointment(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  const clinicId = String(formData.get("clinicId"));
  const local = String(formData.get("at"));
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const at = sfLocalToIso(local);
  const db = await getDb();
  const [clinic] = await db.select({ name: schema.clinics.name }).from(schema.clinics).where(eq(schema.clinics.id, clinicId));
  await db
    .update(schema.setupRequests)
    .set({ status: "booked", appointment: { clinicId, at, notes } })
    .where(eq(schema.setupRequests.id, requestId));
  await db.insert(schema.activity).values({
    requestId,
    clinicId,
    kind: "status",
    body: `Booked ${formatSf(at, { weekday: "short" })} at ${clinic?.name ?? "clinic"}`,
  });
  await touch(requestId);
}

export async function rerunExtraction(formData: FormData) {
  const petId = String(formData.get("petId"));
  const requestId = String(formData.get("requestId"));
  await runExtraction(petId);
  await touch(requestId);
}

export async function updateClinic(formData: FormData) {
  const id = String(formData.get("clinicId"));
  const accepting = String(formData.get("accepting")) as "yes" | "no" | "unknown";
  const fee = String(formData.get("examFee") ?? "").trim();
  const db = await getDb();
  await db
    .update(schema.clinics)
    .set({
      accepting: ["yes", "no", "unknown"].includes(accepting) ? accepting : "unknown",
      acceptingCheckedAt: new Date(),
      examFeeUsd: fee && Number.isFinite(Number(fee)) ? Math.round(Number(fee)) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.clinics.id, id));
  revalidatePath("/ops/clinics");
}

export async function importClinics(_: unknown, formData: FormData): Promise<{ message: string }> {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a CSV file first." };
  const db = await getDb();
  try {
    const r = await importClinicsCsv(db, await file.text());
    revalidatePath("/ops/clinics");
    return { message: `Added ${r.inserted}, updated ${r.updated}${r.skipped.length ? `, skipped ${r.skipped.length}` : ""}.` };
  } catch (e) {
    return { message: `Couldn't read that CSV: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}
