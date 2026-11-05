import { NextResponse, after } from "next/server";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { IntakeInput } from "@/lib/intake";
import { MAX_RECORD_BYTES, MAX_RECORDS_PER_PET, isSupportedRecordType } from "@/lib/records";
import { runExtraction } from "@/lib/jobs";
import { storeUpload } from "@/lib/storage";
import { notify, notifyOps } from "@/lib/notify";
import { SPECIES_LABEL } from "@/lib/species";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "We couldn't read that submission. Please try again." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return NextResponse.json({ error: "Missing form data." }, { status: 400 });
  }

  const parsed = IntakeInput.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Please check the form.", path: first?.path }, { status: 422 });
  }
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true, token: null }); // honeypot

  // Files arrive as records-<petIndex>
  const filesByPet: File[][] = input.pets.map((_, i) =>
    form.getAll(`records-${i}`).filter((f): f is File => f instanceof File && f.size > 0),
  );
  for (const files of filesByPet) {
    if (files.length > MAX_RECORDS_PER_PET)
      return NextResponse.json({ error: `Up to ${MAX_RECORDS_PER_PET} files per pet.` }, { status: 422 });
    for (const f of files) {
      if (!isSupportedRecordType(f.type))
        return NextResponse.json(
          { error: `${f.name} isn't a PDF, JPG, PNG or WebP. Export it as one of those and try again.` },
          { status: 422 },
        );
      if (f.size > MAX_RECORD_BYTES)
        return NextResponse.json({ error: `${f.name} is over 10 MB. Try a smaller scan or photo.` }, { status: 422 });
    }
  }

  const db = await getDb();
  const token = randomBytes(18).toString("base64url");

  // Upload files first so the database transaction stays short.
  const stored = await Promise.all(
    filesByPet.map((files) =>
      Promise.all(
        files.map(async (f) => ({
          filename: f.name.slice(0, 200),
          mimeType: f.type,
          size: f.size,
          ...(await storeUpload("records", { name: f.name, type: f.type, bytes: Buffer.from(await f.arrayBuffer()) })),
        })),
      ),
    ),
  );

  const { requestId, petIds } = await db.transaction(async (tx) => {
    const [owner] = await tx
      .insert(schema.owners)
      .values({
        name: input.owner.name,
        email: input.owner.email.toLowerCase(),
        phone: input.owner.phone || null,
        neighborhood: input.owner.neighborhood,
        moveStatus: input.owner.moveStatus,
        moveDate: input.owner.moveDate || null,
        referral: input.owner.referral || null,
      })
      .returning({ id: schema.owners.id });

    const [request] = await tx
      .insert(schema.setupRequests)
      .values({
        ownerId: owner.id,
        token,
        preferences: input.preferences,
        consentAt: new Date(),
      })
      .returning({ id: schema.setupRequests.id });

    const petIds: string[] = [];
    for (const [i, p] of input.pets.entries()) {
      const files = filesByPet[i];
      const [pet] = await tx
        .insert(schema.pets)
        .values({
          requestId: request.id,
          name: p.name,
          species: p.species,
          speciesOther: p.speciesOther || null,
          breed: p.breed || null,
          age: p.age || null,
          sex: p.sex,
          fixed: p.fixed,
          medications: p.medications || null,
          conditions: p.conditions || null,
          insurer: p.insurer || null,
          extractionStatus: files.length ? "pending" : "none",
        })
        .returning({ id: schema.pets.id });
      petIds.push(pet.id);
      for (const f of stored[i]) {
        await tx.insert(schema.petRecords).values({ petId: pet.id, ...f });
      }
    }

    await tx.insert(schema.activity).values({
      requestId: request.id,
      kind: "system",
      body: `Setup requested for ${input.pets.map((p) => p.name).join(", ")} in ${input.owner.neighborhood}.`,
    });
    return { requestId: request.id, petIds };
  });

  const petList = input.pets.map((p) => `${p.name} (${p.species === "other" ? p.speciesOther || "other" : SPECIES_LABEL[p.species]})`).join(", ");

  // Read records with Claude and send emails after responding, so the owner isn't kept waiting.
  after(async () => {
    await notify({
      email: input.owner.email,
      kind: "received",
      requestId,
      title: "We got your setup request",
      body: `Thanks, ${input.owner.name.split(" ")[0]}. We're finding a vet for ${petList} near ${input.owner.neighborhood}.\nWe aim to book a first visit within 48 hours and will email you when it's confirmed. You can check progress any time.`,
      link: `/p/${token}`,
      ctaLabel: "See your setup",
    });
    await notifyOps(`New setup: ${petList}`, [`${input.owner.name}, ${input.owner.neighborhood}`], `/ops/r/${requestId}`);
    for (const [i, petId] of petIds.entries()) {
      if (filesByPet[i].length) await runExtraction(petId);
    }
    const db2 = await getDb();
    await db2.update(schema.setupRequests).set({ updatedAt: new Date() }).where(eq(schema.setupRequests.id, requestId));
  });

  return NextResponse.json({ ok: true, token });
}
