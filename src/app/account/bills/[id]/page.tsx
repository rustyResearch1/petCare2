import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { billCheckFor } from "@/lib/account";
import { AutoRefresh } from "@/components/account/AutoRefresh";

const money = (c: number | null | undefined) =>
  c == null ? "Not found" : `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BASIS: Record<string, string> = {
  our_data: "From invoices other SF owners shared",
  clinic_list: "From exam fees SF clinics told us",
  web: "From published prices online",
  none: "No comparable price found yet",
};

export default async function BillReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;
  const data = await billCheckFor(user.email, id);
  if (!data) notFound();
  const { check, items } = data;
  const report = check.report;

  return (
    <div className="grid gap-8">
      <div>
        <Link href="/account/bills" className="text-[0.875rem] text-muted hover:text-ink">Bill check</Link>
        <h1 className="mt-1 text-[clamp(1.75rem,5vw,2.5rem)] font-[760] [font-stretch:86%] leading-[1.05]">
          {check.clinicName ?? "Your invoice"}
        </h1>
        <p className="mt-2 text-muted">{[check.petName, check.visitDate, check.totalCents != null ? money(check.totalCents) : null].filter(Boolean).join(", ")}</p>
      </div>

      {check.status === "pending" && (
        <div className="rounded-2xl border border-line bg-paper p-6" role="status">
          <AutoRefresh seconds={6} />
          <p className="font-[640]">Reading your invoice and looking up prices</p>
          <p className="mt-1 text-muted">This usually takes about a minute. You can leave this page; we&apos;ll email you when it&apos;s ready.</p>
        </div>
      )}

      {check.status === "failed" && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
          <p className="font-[640]">We couldn&apos;t read this one</p>
          <p className="mt-1 leading-relaxed">{check.error?.startsWith("This doesn't")
              ? check.error
              : check.error?.includes("ANTHROPIC_API_KEY")
                ? "Bill checks aren't switched on yet. We'll run this one as soon as they are."
                : "Try a clearer photo of the itemized bill, taken flat and in good light."}</p>
          <Link href="/account/bills" className="btn btn-quiet mt-4">Try another upload</Link>
        </div>
      )}

      {check.status === "done" && report && (
        <>
          <section className="rounded-2xl border border-line bg-paper p-6">
            <p className="text-[0.875rem] text-muted">Possible savings</p>
            <p className="tabular font-display text-[clamp(2.5rem,9vw,3.75rem)] font-[760] [font-stretch:82%] leading-none">
              {report.potentialSavingsCents > 0 ? money(report.potentialSavingsCents) : "$0"}
            </p>
            <p className="mt-4 max-w-[60ch] leading-relaxed">{report.summary}</p>
          </section>

          <section aria-labelledby="items-h">
            <h2 id="items-h" className="text-[1.25rem] font-[700] [font-stretch:90%]">Line by line</h2>
            <ul className="mt-3 grid gap-3">
              {report.findings.map((f, i) => {
                const high = f.paidCents != null && f.typicalHighCents != null && f.paidCents > f.typicalHighCents;
                return (
                  <li key={f.description + i} className="rounded-2xl border border-line bg-paper p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="min-w-0 font-[620]">{f.description}</p>
                      <p className={`tabular font-[640] ${high ? "text-danger" : ""}`}>{money(f.paidCents)}</p>
                    </div>
                    <p className="tabular mt-1 text-[0.9375rem] text-muted">
                      {f.typicalLowCents != null || f.typicalHighCents != null
                        ? `Typical ${money(f.typicalLowCents)} to ${money(f.typicalHighCents)}. `
                        : ""}
                      {BASIS[f.basis]}
                    </p>
                    {f.cheaperOption && <p className="mt-2 text-[0.9375rem] leading-relaxed text-seaglass">{f.cheaperOption}</p>}
                    {f.note && <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{f.note}</p>}
                    {f.sources.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem]">
                        {f.sources.map((s) => (
                          <li key={s.url}>
                            <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{s.title}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {report.nextSteps.length > 0 && (
            <section aria-labelledby="next-h">
              <h2 id="next-h" className="text-[1.25rem] font-[700] [font-stretch:90%]">What you can do</h2>
              <ol className="mt-3 grid gap-2">
                {report.nextSteps.map((s, i) => (
                  <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-2 leading-relaxed">
                    <span className="tabular font-[640] text-iceplant">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="text-[0.875rem] leading-relaxed text-muted">
            This compares prices only. It isn&apos;t veterinary advice and doesn&apos;t judge whether care was needed. Before
            switching a medication or pharmacy, check with your vet; for prescriptions, ask them for a written prescription.
          </p>
          <Link href="/account/assistant" className="btn btn-quiet justify-self-start">Ask the assistant about this</Link>
        </>
      )}

      {items.length > 0 && check.status !== "done" && (
        <p className="text-[0.875rem] text-muted">{items.length} line items read so far.</p>
      )}
    </div>
  );
}
