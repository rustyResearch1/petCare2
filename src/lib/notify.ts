import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db/client";
import type { NotificationKind } from "./db/schema";
import { baseUrl, sendEmail } from "./email";

type NotifyInput = {
  email: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Path on this site, e.g. /account or /p/<token>. */
  link?: string;
  requestId?: string | null;
  /** Email it as well as showing it in the account. Defaults to true. */
  sendEmail?: boolean;
  ctaLabel?: string;
};

/** Records an in-app notification and emails it. Never throws: a notification must not break the action that caused it. */
export async function notify(n: NotifyInput): Promise<void> {
  try {
    const db = await getDb();
    const email = n.email.toLowerCase();
    const [row] = await db
      .insert(schema.notifications)
      .values({ email, kind: n.kind, title: n.title, body: n.body, link: n.link ?? null, requestId: n.requestId ?? null })
      .returning({ id: schema.notifications.id });
    if (n.sendEmail === false) return;
    const sent = await sendEmail({
      to: email,
      subject: n.title,
      heading: n.title,
      lines: n.body.split("\n").filter(Boolean),
      cta: n.link ? { label: n.ctaLabel ?? "Open Settled", href: `${baseUrl()}${n.link}` } : undefined,
    });
    if (sent) await db.update(schema.notifications).set({ emailedAt: new Date() }).where(eq(schema.notifications.id, row.id));
  } catch (e) {
    console.error("[settled:notify] failed", e);
  }
}

/** Alerts the team (OPS_NOTIFY_EMAIL) about something that needs a person. */
export async function notifyOps(subject: string, lines: string[], path: string): Promise<void> {
  const to = process.env.OPS_NOTIFY_EMAIL;
  if (!to) {
    console.log(`[settled:ops] ${subject} ${baseUrl()}${path}`);
    return;
  }
  try {
    await sendEmail({ to, subject: `[ops] ${subject}`, heading: subject, lines, cta: { label: "Open in ops", href: `${baseUrl()}${path}` } });
  } catch (e) {
    console.error("[settled:ops] alert failed", e);
  }
}
