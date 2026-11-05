import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { signedUrl } from "@/lib/storage";

export const runtime = "nodejs";

// Behind the ops password (see src/proxy.ts). Serves pet records and invoices.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const kind = new URL(req.url).searchParams.get("kind") === "bill" ? "bill" : "record";
  const db = await getDb();
  const table = kind === "bill" ? schema.billFiles : schema.petRecords;
  const [rec] = await db.select().from(table).where(eq(table.id, id));
  if (!rec) return new Response("Not found", { status: 404 });
  if (rec.storageKey) return Response.redirect(await signedUrl(rec.storageKey, rec.filename), 302);
  if (!rec.bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(rec.bytes), {
    headers: {
      "content-type": rec.mimeType,
      "content-disposition": `inline; filename="${rec.filename.replace(/["\\]/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
