import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "./db/client";

/** Everything tied to one verified email: setups, pets, appointments. */
export async function setupsForEmail(email: string) {
  const db = await getDb();
  const rows = await db
    .select({ request: schema.setupRequests, owner: schema.owners })
    .from(schema.setupRequests)
    .innerJoin(schema.owners, eq(schema.owners.id, schema.setupRequests.ownerId))
    .where(eq(schema.owners.email, email.toLowerCase()))
    .orderBy(desc(schema.setupRequests.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.request.id);
  const pets = await db.select().from(schema.pets).where(inArray(schema.pets.requestId, ids)).orderBy(asc(schema.pets.name));
  const clinicIds = rows.map((r) => r.request.appointment?.clinicId).filter((x): x is string => Boolean(x));
  const clinics = clinicIds.length ? await db.select().from(schema.clinics).where(inArray(schema.clinics.id, clinicIds)) : [];
  return rows.map((r) => ({
    ...r,
    pets: pets.filter((p) => p.requestId === r.request.id),
    clinic: clinics.find((c) => c.id === r.request.appointment?.clinicId) ?? null,
  }));
}

export async function notificationsFor(email: string, limit = 20) {
  const db = await getDb();
  return db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.email, email.toLowerCase()))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
}

export async function markNotificationsRead(email: string) {
  const db = await getDb();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.email, email.toLowerCase()), isNull(schema.notifications.readAt)));
}

export async function billChecksFor(email: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.billChecks)
    .where(eq(schema.billChecks.email, email.toLowerCase()))
    .orderBy(desc(schema.billChecks.createdAt));
}

export async function billCheckFor(email: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [check] = await db
    .select()
    .from(schema.billChecks)
    .where(and(eq(schema.billChecks.id, id), eq(schema.billChecks.email, email.toLowerCase())));
  if (!check) return null;
  const items = await db.select().from(schema.billItems).where(eq(schema.billItems.billCheckId, id));
  const files = await db
    .select({ id: schema.billFiles.id, filename: schema.billFiles.filename })
    .from(schema.billFiles)
    .where(eq(schema.billFiles.billCheckId, id));
  return { check, items, files };
}

export async function messagesFor(email: string, limit = 60) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.email, email.toLowerCase()))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export const OWNER_STATUS_LABEL: Record<string, string> = {
  new: "Received",
  shortlisting: "Shortlisting",
  contacting: "Calling clinics",
  booked: "Booked",
  done: "Done",
  cancelled: "Cancelled",
};
