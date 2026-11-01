import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db/client";

export async function getRequestByToken(token: string) {
  const db = await getDb();
  const [req] = await db.select().from(schema.setupRequests).where(eq(schema.setupRequests.token, token));
  if (!req) return null;
  return loadRequest(req.id);
}

export async function loadRequest(id: string) {
  const db = await getDb();
  const [req] = await db.select().from(schema.setupRequests).where(eq(schema.setupRequests.id, id));
  if (!req) return null;
  const [owner] = await db.select().from(schema.owners).where(eq(schema.owners.id, req.ownerId));
  const pets = await db.select().from(schema.pets).where(eq(schema.pets.requestId, id)).orderBy(asc(schema.pets.name));
  const records = pets.length
    ? await db
        .select({
          id: schema.petRecords.id,
          petId: schema.petRecords.petId,
          filename: schema.petRecords.filename,
          mimeType: schema.petRecords.mimeType,
          size: schema.petRecords.size,
        })
        .from(schema.petRecords)
        .where(inArray(schema.petRecords.petId, pets.map((p) => p.id)))
    : [];
  const log = await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.requestId, id))
    .orderBy(desc(schema.activity.createdAt));
  const appointmentClinic = req.appointment?.clinicId
    ? ((await db.select().from(schema.clinics).where(eq(schema.clinics.id, req.appointment.clinicId)))[0] ?? null)
    : null;
  return { request: req, owner, pets, records, log, appointmentClinic };
}

export async function listRequests() {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.setupRequests.id,
      status: schema.setupRequests.status,
      createdAt: schema.setupRequests.createdAt,
      updatedAt: schema.setupRequests.updatedAt,
      appointment: schema.setupRequests.appointment,
      ownerName: schema.owners.name,
      neighborhood: schema.owners.neighborhood,
      pets: sql<string>`coalesce((select string_agg(p.name || ' (' || coalesce(p.species_other, p.species) || ')', ', ') from pets p where p.request_id = ${schema.setupRequests.id}), '')`,
      minutes: sql<number>`coalesce((select sum(a.minutes) from activity a where a.request_id = ${schema.setupRequests.id}), 0)::int`,
      bookedAt: sql<string | null>`(select min(a.created_at) from activity a where a.request_id = ${schema.setupRequests.id} and a.kind = 'status' and a.body like 'Booked%')`,
    })
    .from(schema.setupRequests)
    .innerJoin(schema.owners, eq(schema.owners.id, schema.setupRequests.ownerId))
    .orderBy(desc(schema.setupRequests.createdAt));
  return rows;
}

export async function listClinics() {
  const db = await getDb();
  return db.select().from(schema.clinics).orderBy(asc(schema.clinics.name));
}
