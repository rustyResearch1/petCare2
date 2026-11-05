import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { billChecksFor, setupsForEmail } from "@/lib/account";
import { formatSf } from "@/lib/time";
import { BillUpload } from "@/components/account/BillUpload";

const money = (c: number | null | undefined) => (c == null ? "" : `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export default async function BillsPage() {
  const user = (await currentUser())!;
  const [checks, setups] = await Promise.all([billChecksFor(user.email), setupsForEmail(user.email)]);
  const petNames = [...new Set(setups.flatMap((s) => s.pets.map((p) => p.name)))];

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-[clamp(2rem,6vw,2.75rem)] font-[760] [font-stretch:86%] leading-[1]">Bill check</h1>
        <p className="mt-3 max-w-[38rem] leading-relaxed text-muted">
          Upload a vet invoice or estimate. We read each line, compare it with what other San Francisco clinics and pet
          pharmacies charge, and show where you could pay less. This compares prices only; ask your vet about any change to
          your pet&apos;s care.
        </p>
      </div>

      <BillUpload petNames={petNames} />

      <section aria-labelledby="past-h">
        <h2 id="past-h" className="text-[1.25rem] font-[700] [font-stretch:90%]">Your checks</h2>
        {checks.length === 0 ? (
          <p className="mt-3 text-muted">None yet. Your first check takes about a minute.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-paper">
            {checks.map((c) => (
              <li key={c.id}>
                <Link href={`/account/bills/${c.id}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-fog/60">
                  <span className="min-w-0">
                    <span className="font-[620]">{c.clinicName ?? (c.status === "pending" ? "Reading your invoice" : "Invoice")}</span>
                    <span className="ml-2 text-[0.875rem] text-muted">
                      {[c.petName, c.visitDate, money(c.totalCents)].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <span className="tabular text-[0.875rem]">
                    {c.status === "pending" && <span className="text-muted">Working on it</span>}
                    {c.status === "failed" && <span className="text-danger">Couldn&apos;t read</span>}
                    {c.status === "done" &&
                      (c.report && c.report.potentialSavingsCents > 0 ? (
                        <span className="font-[620] text-seaglass">Up to {money(c.report.potentialSavingsCents)} less</span>
                      ) : (
                        <span className="text-muted">Prices look typical</span>
                      ))}
                    <span className="ml-2 text-muted">{formatSf(c.createdAt, { hour: undefined, minute: undefined })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
