import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PET_PROFILE_JSON_SCHEMA, PetProfileSchema, type PetProfile } from "./records";

export type RecordFile = { filename: string; mimeType: string; bytes: Buffer };

const SYSTEM = `You read veterinary records (vaccine certificates, invoices, visit summaries, adoption papers) that a pet owner uploaded so a new clinic can register their pet.
Extract only what the documents state. Never guess dates or diagnoses. Use null or an empty list when something is absent.
Normalize dates to YYYY-MM-DD when the document gives a full date. Keep vaccine names as written (e.g. "Rabies 3yr", "DHPP", "FVRCP", "RHDV2").
In unreadable_or_missing, list anything illegible or cut off, and anything a new clinic will usually ask for that these records lack (for a dog: rabies certificate, DHPP; for a cat: rabies, FVRCP; for a rabbit: RHDV2).
Write the summary for a clinic front desk: who the pet is, what is current, what is overdue or missing.`;

export function extractionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Reads uploaded records with Claude and returns a validated profile. Throws on API or validation failure. */
export async function extractPetProfile(
  pet: { name: string; species: string; breed?: string | null },
  files: RecordFile[],
): Promise<PetProfile> {
  const client = new Anthropic();
  const model = process.env.EXTRACTION_MODEL || "claude-sonnet-5-5";

  const content: Anthropic.ContentBlockParam[] = [];
  for (const f of files) {
    const data = f.bytes.toString("base64");
    if (f.mimeType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: f.filename });
    } else if (f.mimeType === "image/jpeg" || f.mimeType === "image/png" || f.mimeType === "image/webp" || f.mimeType === "image/gif") {
      content.push({ type: "image", source: { type: "base64", media_type: f.mimeType, data } });
    }
  }
  content.push({
    type: "text",
    text: `Pet as described by the owner: ${pet.name}, ${pet.species}${pet.breed ? `, ${pet.breed}` : ""}.\nToday's date: ${new Date().toISOString().slice(0, 10)}.\nExtract the profile from the ${files.length} attached record file(s).`,
  });

  const res = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content }],
    output_config: { format: { type: "json_schema", schema: PET_PROFILE_JSON_SCHEMA as unknown as Record<string, unknown> } },
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return PetProfileSchema.parse(JSON.parse(text));
}
