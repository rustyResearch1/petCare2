import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/site/Header";
import { StatusTrack } from "@/components/StatusTrack";
import { getRequestByToken } from "@/lib/queries";
import { upcomingVaccines } from "@/lib/records";
import { SPECIES_LABEL, isSpecies } from "@/lib/species";
import { site } from "@/lib/site";
import { InstallHint } from "@/components/pwa/InstallHint";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your setup", robots: { index: false } };

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatDate(s: string | null) {
  if (!s) return "Unknown";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function OwnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  const data = await getRequestByToken(token);
  if (!data) notFound();
  const { request, owner, pets, appointmentClinic } = data;
  const booked = request.status === "booked" || request.status === "done";
  const today = new Date();

  return (
    <>
      <Header showCta={false} />
      <main className="gutter pb-20 pt-10">
        <div className="mx-auto max-w-3xl">
          {isNew && (
            <div role="status" className="mb-8 rounded-2xl border border-seaglass/40 bg-seaglass/10 p-5">
              <p className="font-[640]">Got it, {owner.name.split(" ")[0]}.</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">
                We&apos;re on it. Bookmark this page; it updates as we go, and we&apos;ll email {owner.email} when your visit is booked.
              </p>
            </div>
          )}

          <div className="mb-8">
            <InstallHint />
          </div>

          <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-[760] [font-stretch:86%] leading-[1]">
            {pets.map((p) => p.name).join(" and ")}&apos;s setup
          </h1>
          <p className="mt-3 text-muted">{owner.neighborhood}, San Francisco</p>

          <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <section aria-labelledby="progress-h">
              <h2 id="progress-h" className="mb-4 text-[1.25rem] font-[700] [font-stretch:90%]">Progress</h2>
              {request.status === "cancelled" ? (
                <p className="text-muted">This request was cancelled. Email {site.contactEmail} to restart it.</p>
              ) : (
                <StatusTrack status={request.status} />
              )}
            </section>

            <section aria-labelledby="visit-h" className="min-w-0">
              <h2 id="visit-h" className="mb-4 text-[1.25rem] font-[700] [font-stretch:90%]">First visit</h2>
              {booked && request.appointment ? (
                <div className="rounded-2xl border border-line bg-paper p-5">
                  <p className="font-display text-[1.5rem] font-[720] [font-stretch:90%] leading-tight">
                    {formatWhen(request.appointment.at)}
                  </p>
                  {appointmentClinic && (
                    <div className="mt-3 grid gap-1 text-[0.9375rem]">
                      <p className="font-[620]">{appointmentClinic.name}</p>
                      {appointmentClinic.address && <p className="text-muted">{appointmentClinic.address}</p>}
                      {appointmentClinic.phone && <p className="select-all text-muted">{appointmentClinic.phone}</p>}
                    </div>
                  )}
                  {request.appointment.notes && <p className="mt-3 text-[0.9375rem] text-muted">{request.appointment.notes}</p>}
                  {site.paymentLinkUrl && (
                    <a href={site.paymentLinkUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-5">
                      Pay ${site.pricePerPetUsd * pets.length}
                    </a>
                  )}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-line p-5 text-muted">
                  Not booked yet. We aim to confirm a visit within {site.targetHours} hours of your request.
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="records-h" className="mt-14">
            <h2 id="records-h" className="mb-4 text-[1.25rem] font-[700] [font-stretch:90%]">Records</h2>
            <div className="grid gap-4">
              {pets.map((p) => {
                const due = upcomingVaccines(p.profile, today, 60);
                return (
                  <article key={p.id} className="rounded-2xl border border-line bg-paper p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[1.25rem] font-[700] [font-stretch:90%]">{p.name}</h3>
                      <p className="text-[0.875rem] text-muted">
                        {p.speciesOther || (isSpecies(p.species) ? SPECIES_LABEL[p.species] : p.species)}
                        {p.breed ? `, ${p.breed}` : ""}
                        {p.age ? `, ${p.age}` : ""}
                      </p>
                    </div>
                    {p.extractionStatus === "pending" && <p className="mt-3 text-muted">Reading your records now.</p>}
                    {p.extractionStatus === "none" && (
                      <p className="mt-3 text-muted">No records uploaded. We&apos;ll ask your previous clinic if needed.</p>
                    )}
                    {(p.extractionStatus === "failed" || p.extractionStatus === "skipped") && (
                      <p className="mt-3 text-muted">We have your files and will read them by hand.</p>
                    )}
                    {p.profile && (
                      <>
                        <p className="mt-3 max-w-[60ch] leading-relaxed">{p.profile.summary}</p>
                        {due.length > 0 && (
                          <ul className="mt-4 grid gap-1.5">
                            {due.map((v) => (
                              <li key={v.name} className="flex flex-wrap items-center gap-2 text-[0.9375rem]">
                                <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-[600] ${v.overdue ? "bg-danger/15 text-danger" : "bg-amber/15 text-amber"}`}>
                                  {v.overdue ? "Overdue" : "Due soon"}
                                </span>
                                {v.name}, {formatDate(v.next_due)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {p.profile.vaccines.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[22rem] text-left text-[0.9375rem]">
                              <thead className="text-[0.8125rem] text-muted">
                                <tr>
                                  <th className="py-1.5 pr-4 font-[560]">Vaccine</th>
                                  <th className="py-1.5 pr-4 font-[560]">Given</th>
                                  <th className="py-1.5 font-[560]">Next due</th>
                                </tr>
                              </thead>
                              <tbody className="tabular">
                                {p.profile.vaccines.map((v, i) => (
                                  <tr key={v.name + i} className="border-t border-line">
                                    <td className="py-1.5 pr-4">{v.name}</td>
                                    <td className="py-1.5 pr-4">{formatDate(v.given_on)}</td>
                                    <td className="py-1.5">{formatDate(v.next_due)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
