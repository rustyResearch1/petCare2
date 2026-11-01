import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const [rec] = await db.select().from(schema.petRecords).where(eq(schema.petRecords.id, id));
  if (!rec) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(rec.bytes), {
    headers: {
      "content-type": rec.mimeType,
      "content-disposition": `inline; filename="${rec.filename.replace(/["\\]/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
