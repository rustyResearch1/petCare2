import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { chat } from "@/lib/assistant";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ message: z.string().trim().min(1).max(4000) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the assistant." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a message first." }, { status: 422 });
  try {
    const reply = await chat(user.email, parsed.data.message);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[settled:assistant] failed", e);
    return NextResponse.json({ error: "The assistant couldn't answer just now. Try again in a minute." }, { status: 500 });
  }
}
