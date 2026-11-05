import { NextResponse, after } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db/client";
import { storeUpload } from "@/lib/storage";
import { runBillCheck } from "@/lib/bills";
import { isSupportedRecordType, MAX_RECORD_BYTES } from "@/lib/records";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILES = 4;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to check a bill." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "We couldn't read that upload. Please try again." }, { status: 400 });
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Add a photo or PDF of your invoice." }, { status: 422 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Up to ${MAX_FILES} files per bill.` }, { status: 422 });
  for (const f of files) {
    if (!isSupportedRecordType(f.type)) return NextResponse.json({ error: `${f.name} isn't a PDF, JPG, PNG or WebP.` }, { status: 422 });
    if (f.size > MAX_RECORD_BYTES) return NextResponse.json({ error: `${f.name} is over 10 MB.` }, { status: 422 });
  }
  const petName = String(form.get("petName") ?? "").trim().slice(0, 60) || null;

  const stored = await Promise.all(
    files.map(async (f) => ({
      filename: f.name.slice(0, 200),
      mimeType: f.type,
      size: f.size,
      ...(await storeUpload("bills", { name: f.name, type: f.type, bytes: Buffer.from(await f.arrayBuffer()) })),
    })),
  );
  const db = await getDb();
  const [check] = await db.insert(schema.billChecks).values({ email: user.email, petName }).returning({ id: schema.billChecks.id });
  await db.insert(schema.billFiles).values(stored.map((s) => ({ ...s, billCheckId: check.id })));

  after(() => runBillCheck(check.id));
  return NextResponse.json({ ok: true, id: check.id });
}
