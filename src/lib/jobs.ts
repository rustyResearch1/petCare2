import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db/client";
import { extractPetProfile, extractionConfigured } from "./extract";
import { loadUpload } from "./storage";

/** Reads a pet's uploaded records with Claude and stores the structured profile. Safe to re-run. */
export async function runExtraction(petId: string): Promise<void> {
  const db = await getDb();
  const [pet] = await db.select().from(schema.pets).where(eq(schema.pets.id, petId));
  if (!pet) return;
  const records = await db.select().from(schema.petRecords).where(eq(schema.petRecords.petId, petId));
  if (!records.length) {
    await db.update(schema.pets).set({ extractionStatus: "none" }).where(eq(schema.pets.id, petId));
    return;
  }
  if (!extractionConfigured()) {
    await db
      .update(schema.pets)
      .set({ extractionStatus: "skipped", extractionError: "ANTHROPIC_API_KEY is not set" })
      .where(eq(schema.pets.id, petId));
    return;
  }
  await db.update(schema.pets).set({ extractionStatus: "pending", extractionError: null }).where(eq(schema.pets.id, petId));
  try {
    const profile = await extractPetProfile(
      { name: pet.name, species: pet.speciesOther || pet.species, breed: pet.breed },
      await Promise.all(records.map(async (r) => ({ filename: r.filename, mimeType: r.mimeType, bytes: await loadUpload(r) }))),
    );
    await db.update(schema.pets).set({ profile, extractionStatus: "done" }).where(eq(schema.pets.id, petId));
    await db.insert(schema.activity).values({
      requestId: pet.requestId,
      kind: "system",
      body: `Read ${records.length} record file(s) for ${pet.name}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
    await db
      .update(schema.pets)
      .set({ extractionStatus: "failed", extractionError: message })
      .where(eq(schema.pets.id, petId));
  }
}
