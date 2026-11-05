import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { formatSf } from "@/lib/time";
import { replyToOwner, resolveTask } from "../actions";

const KIND_LABEL: Record<string, string> = {
  book: "Book a visit",
  reschedule: "Reschedule",
  records: "Records",
  price_check: "Price check",
  question: "Question",
  other: "Other",
};

const money = (c: number | null | undefined) => (c == null ? "" : `$${(c / 100).toFixed(2)}`);

export default async function Inbox() {
  const db = await getDb();
  const [open, recentMessages, bills] = await Promise.all([
    db.select().from(schema.tasks).where(eq(schema.tasks.status, "open")).orderBy(desc(schema.tasks.createdAt)),
    db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(80),
    db.select().from(schema.billChecks).orderBy(desc(schema.billChecks.createdAt)).limit(25),
  ]);
  // Latest few messages per owner, newest conversation first.
  const threads = new Map<string, typeof recentMessages>();
  for (const m of recentMessages) {
    const t = threads.get(m.email) ?? [];
    if (t.length < 4) t.push(m);
    threads.set(m.email, t);
  }

  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <h1 className="text-[2rem] font-[740] [font-stretch:88%]">Inbox</h1>
        <h2 className="text-[1.25rem] font-[700] [font-stretch:90%]">Open requests ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-muted">Nothing waiting. Requests from the assistant and unpriced bill items land here.</p>
        ) : (
          <ul className="grid gap-3">
            {open.map((t) => (
              <li key={t.id} className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-[640]">
                    {KIND_LABEL[t.kind] ?? t.kind}
                    {t.petName ? ` for ${t.petName}` : ""}
                    <span className="ml-2 text-[0.875rem] font-normal text-muted">{t.email}</span>
                  </p>
                  <span className="tabular text-[0.8125rem] text-muted">{formatSf(t.createdAt)} by {t.createdBy}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{t.details}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-[0.875rem]">
                  {t.requestId && <Link className="underline underline-offset-4" href={`/ops/r/${t.requestId}`}>Open setup</Link>}
                  {t.billCheckId && <Link className="underline underline-offset-4" href={`#bill-${t.billCheckId}`}>See bill</Link>}
                </div>
                <form action={replyToOwner} className="mt-3 grid gap-2">
                  <input type="hidden" name="email" value={t.email} />
                  <input type="hidden" name="taskId" value={t.id} />
                  <textarea name="body" className="input" placeholder="Reply to the owner (shows in their chat and is emailed)" aria-label="Reply" />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-[0.875rem]">
                      <input type="checkbox" name="resolve" defaultChecked className="accent-[var(--iceplant)]" /> Mark done
                    </label>
                    <button className="btn btn-primary min-h-10 px-4 py-1.5">Send reply</button>
                  </div>
                </form>
                <form action={resolveTask} className="mt-2">
                  <input type="hidden" name="taskId" value={t.id} />
                  <button className="text-[0.875rem] text-muted underline underline-offset-4">Mark done without replying</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="text-[1.25rem] font-[700] [font-stretch:90%]">Recent conversations</h2>
        {threads.size === 0 ? (
          <p className="text-muted">No assistant conversations yet.</p>
        ) : (
          <ul className="grid gap-3">
            {[...threads].map(([email, msgs]) => (
              <li key={email} className="rounded-2xl border border-line bg-paper p-4">
                <p className="font-[640]">{email}</p>
                <ol className="mt-2 grid gap-1.5">
                  {[...msgs].reverse().map((m) => (
                    <li key={m.id} className="grid grid-cols-[5.5rem_1fr] gap-2 text-[0.9375rem]">
                      <span className="text-[0.8125rem] text-muted">{m.role === "user" ? "Owner" : m.role === "team" ? "You" : "Assistant"}</span>
                      <span className="min-w-0 whitespace-pre-wrap">{m.content.length > 400 ? `${m.content.slice(0, 400)}...` : m.content}</span>
                    </li>
                  ))}
                </ol>
                <form action={replyToOwner} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="email" value={email} />
                  <input name="body" className="input min-h-10 flex-1 py-1.5" placeholder="Reply as the team" aria-label={`Reply to ${email}`} />
                  <button className="btn btn-quiet min-h-10 px-4 py-1.5">Send</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="text-[1.25rem] font-[700] [font-stretch:90%]">Bill checks</h2>
        {bills.length === 0 ? (
          <p className="text-muted">No invoices uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
            <table className="w-full min-w-[44rem] text-left text-[0.9375rem]">
              <thead className="text-[0.8125rem] text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 font-[560]">Owner</th>
                  <th className="px-4 py-2.5 font-[560]">Clinic</th>
                  <th className="px-4 py-2.5 font-[560]">Total</th>
                  <th className="px-4 py-2.5 font-[560]">Savings found</th>
                  <th className="px-4 py-2.5 font-[560]">Status</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {bills.map((b) => (
                  <tr key={b.id} id={`bill-${b.id}`} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3">{b.email}</td>
                    <td className="px-4 py-3">{b.clinicName ?? ""}<div className="text-[0.8125rem] text-muted">{b.visitDate ?? ""}</div></td>
                    <td className="px-4 py-3">{money(b.totalCents)}</td>
                    <td className="px-4 py-3">{b.report ? money(b.report.potentialSavingsCents) : ""}</td>
                    <td className="px-4 py-3">{b.status}{b.error ? <div className="text-[0.8125rem] text-danger">{b.error.slice(0, 120)}</div> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
