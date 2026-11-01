import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRequest, listClinics } from "@/lib/queries";
import { rankClinics } from "@/lib/match";
import { REQUEST_STATUSES } from "@/lib/db/schema";
import { PRIORITY_LABEL, TIME_LABEL, TRAVEL_LABEL } from "@/lib/intake";
import { SPECIES_LABEL, isSpecies } from "@/lib/species";
import { upcomingVaccines } from "@/lib/records";
import { formatSf } from "@/lib/time";
import { AcceptingPill, StatusPill } from "@/components/ops/StatusPill";
import { bookAppointment, logActivity, rerunExtraction, setStatus } from "../../actions";

const H2 = "text-[1.25rem] font-[700] [font-stretch:90%]";
const BOX = "rounded-2xl border border-line bg-paper p-5";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadRequest(id);
  if (!data) notFound();
  const { request, owner, pets, records, log, appointmentClinic } = data;
  const clinics = await listClinics();
  const prefs = request.preferences;
  const base = process.env.PUBLIC_BASE_URL ?? "";

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/ops" className="text-[0.875rem] text-muted hover:text-ink">Requests</Link>
          <h1 className="mt-1 text-[2rem] font-[740] [font-stretch:88%]">{owner.name}</h1>
          <p className="text-muted">
            {owner.neighborhood}. {owner.moveStatus === "moving" ? `Moving ${owner.moveDate ?? "soon"}. ` : ""}
            Requested {formatSf(request.createdAt)}.
          </p>
        </div>
        <form action={setStatus} className="flex items-center gap-2">
          <input type="hidden" name="requestId" value={request.id} />
          <StatusPill status={request.status} />
          <select name="status" defaultValue={request.status} className="input min-h-10 w-auto py-1.5" aria-label="Status">
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="btn btn-quiet min-h-10 px-4 py-1.5">Update</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left column: owner, preferences, pets */}
        <div className="grid content-start gap-6">
          <section className={BOX}>
            <h2 className={H2}>Owner</h2>
            <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-muted">Email</dt><dd className="min-w-0 select-all break-all">{owner.email}</dd>
              <dt className="text-muted">Phone</dt><dd className="select-all">{owner.phone ?? "Not given"}</dd>
              <dt className="text-muted">Times</dt><dd>{prefs.times.map((t) => TIME_LABEL[t]).join(", ") || "Any"}</dd>
              <dt className="text-muted">Travel</dt><dd>{TRAVEL_LABEL[prefs.travel]}</dd>
              <dt className="text-muted">Priority</dt><dd>{PRIORITY_LABEL[prefs.priority]}</dd>
              <dt className="text-muted">Clinic type</dt><dd>{prefs.clinicType === "independent" ? "Prefers independent" : "Any"}</dd>
              {prefs.notes && (<><dt className="text-muted">Notes</dt><dd className="whitespace-pre-wrap">{prefs.notes}</dd></>)}
              {owner.referral && (<><dt className="text-muted">Heard via</dt><dd>{owner.referral}</dd></>)}
              <dt className="text-muted">Owner page</dt>
              <dd className="min-w-0 break-all"><Link className="underline" href={`/p/${request.token}`}>{base}/p/{request.token}</Link></dd>
            </dl>
          </section>

          {pets.map((p) => {
            const files = records.filter((r) => r.petId === p.id);
            const due = upcomingVaccines(p.profile, new Date(), 60);
            return (
              <section key={p.id} className={BOX}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={H2}>{p.name}</h2>
                  <span className="text-[0.875rem] text-muted">
                    {p.speciesOther || (isSpecies(p.species) ? SPECIES_LABEL[p.species] : p.species)}
                    {p.breed ? `, ${p.breed}` : ""}{p.age ? `, ${p.age}` : ""}
                    {p.sex && p.sex !== "unknown" ? `, ${p.sex}` : ""}{p.fixed === "yes" ? ", fixed" : ""}
                  </span>
                </div>
                {(p.medications || p.conditions || p.insurer) && (
                  <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-[0.9375rem]">
                    {p.medications && (<><dt className="text-muted">Meds</dt><dd className="whitespace-pre-wrap">{p.medications}</dd></>)}
                    {p.conditions && (<><dt className="text-muted">Conditions</dt><dd className="whitespace-pre-wrap">{p.conditions}</dd></>)}
                    {p.insurer && (<><dt className="text-muted">Insurance</dt><dd>{p.insurer}</dd></>)}
                  </dl>
                )}
                <div className="mt-4 border-t border-line pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.875rem] text-muted">
                      Records: {files.length || "none"}. Extraction: <span className="text-ink">{p.extractionStatus}</span>
                    </p>
                    {files.length > 0 && (
                      <form action={rerunExtraction}>
                        <input type="hidden" name="petId" value={p.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <button className="text-[0.875rem] underline underline-offset-4">Read records again</button>
                      </form>
                    )}
                  </div>
                  {p.extractionError && <p className="mt-1 text-[0.8125rem] text-danger">{p.extractionError}</p>}
                  {files.length > 0 && (
                    <ul className="mt-2 grid gap-1 text-[0.875rem]">
                      {files.map((f) => (
                        <li key={f.id}>
                          <a className="underline underline-offset-4" href={`/ops/files/${f.id}`} target="_blank" rel="noreferrer">
                            {f.filename}
                          </a>{" "}
                          <span className="text-muted">({Math.round(f.size / 1024)} KB)</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.profile && (
                    <div className="mt-3 grid gap-2 text-[0.9375rem]">
                      <p className="leading-relaxed">{p.profile.summary}</p>
                      {due.length > 0 && (
                        <p className="text-amber">
                          {due.map((v) => `${v.name} ${v.overdue ? "overdue" : "due"} ${v.next_due}`).join("; ")}
                        </p>
                      )}
                      {p.profile.unreadable_or_missing.length > 0 && (
                        <p className="text-muted">Missing or unclear: {p.profile.unreadable_or_missing.join("; ")}</p>
                      )}
                      <details>
                        <summary className="cursor-pointer text-[0.875rem] text-muted">Full extracted profile</summary>
                        <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-fog p-3 text-[0.75rem]">
                          {JSON.stringify(p.profile, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right column: matches per pet, booking, log */}
        <div className="grid content-start gap-6">
          {request.appointment && (
            <section className={`${BOX} border-seaglass/50`}>
              <h2 className={H2}>Booked</h2>
              <p className="mt-2">
                {formatSf(request.appointment.at, { weekday: "long" })} at {appointmentClinic?.name ?? "clinic"}
              </p>
              {request.appointment.notes && <p className="mt-1 text-muted">{request.appointment.notes}</p>}
            </section>
          )}

          {pets.map((p) => {
            const ranked = rankClinics(
              {
                species: p.species,
                ownerNeighborhood: owner.neighborhood,
                travel: prefs.travel,
                priority: prefs.priority,
                clinicType: prefs.clinicType,
              },
              clinics,
            );
            const top = ranked.filter((r) => !r.excluded).slice(0, 8);
            const excluded = ranked.filter((r) => r.excluded).length;
            return (
              <section key={p.id} className={BOX}>
                <h2 className={H2}>Clinics for {p.name}</h2>
                <p className="mt-1 text-[0.875rem] text-muted">
                  {top.length} candidates from {clinics.length} clinics. {excluded} ruled out (species or not accepting).
                </p>
                {clinics.length === 0 && (
                  <p className="mt-3 text-muted">
                    No clinics loaded. <Link className="underline" href="/ops/clinics">Import a clinic CSV</Link>.
                  </p>
                )}
                <ol className="mt-4 grid gap-3">
                  {top.map((r, i) => (
                    <li key={r.clinic.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-[640]">
                            <span className="tabular mr-2 text-muted">{i + 1}</span>
                            {r.clinic.name}
                          </p>
                          <p className="text-[0.875rem] text-muted">{r.reasons.join(". ")}.</p>
                        </div>
                        <AcceptingPill value={r.clinic.accepting} />
                      </div>
                      <ClinicLinks clinicId={r.clinic.id} clinics={clinics} />
                      <details className="mt-3">
                        <summary className="cursor-pointer text-[0.875rem] font-[600]">Log a call or book</summary>
                        <div className="mt-3 grid gap-4">
                          <form action={logActivity} className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_6rem_auto] sm:items-end">
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="clinicId" value={r.clinic.id} />
                            <input type="hidden" name="kind" value="call" />
                            <select name="outcome" className="input min-h-10 py-1.5" aria-label="Call outcome" defaultValue="accepting">
                              <option value="accepting">Taking new patients</option>
                              <option value="not_accepting">Not taking new patients</option>
                              <option value="no_answer">No answer</option>
                            </select>
                            <input name="body" className="input min-h-10 py-1.5" placeholder="Notes (earliest slot, who you spoke to)" aria-label="Notes" />
                            <input name="examFee" inputMode="numeric" className="input min-h-10 py-1.5" placeholder="Exam $" aria-label="Exam fee" />
                            <input name="minutes" inputMode="numeric" className="input min-h-10 py-1.5" placeholder="Min" aria-label="Minutes spent" />
                            <button className="btn btn-quiet min-h-10 px-3 py-1.5">Log call</button>
                          </form>
                          <form action={bookAppointment} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="clinicId" value={r.clinic.id} />
                            <input type="datetime-local" name="at" required className="input min-h-10 py-1.5" aria-label="Appointment time (San Francisco)" />
                            <input name="notes" className="input min-h-10 py-1.5" placeholder="Notes for the owner (arrive 10 min early...)" aria-label="Notes for owner" />
                            <button className="btn btn-primary min-h-10 px-3 py-1.5">Book</button>
                          </form>
                        </div>
                      </details>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          <section className={BOX}>
            <h2 className={H2}>Log</h2>
            <form action={logActivity} className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_6rem_auto] sm:items-end">
              <input type="hidden" name="requestId" value={request.id} />
              <select name="kind" className="input min-h-10 py-1.5" aria-label="Kind" defaultValue="note">
                <option value="note">Note</option>
                <option value="email">Email</option>
                <option value="form">Form filled</option>
                <option value="call">Call</option>
              </select>
              <input name="body" required className="input min-h-10 py-1.5" placeholder="What happened" aria-label="What happened" />
              <input name="minutes" inputMode="numeric" className="input min-h-10 py-1.5" placeholder="Min" aria-label="Minutes spent" />
              <button className="btn btn-quiet min-h-10 px-3 py-1.5">Add</button>
            </form>
            <ol className="mt-4 grid gap-2.5">
              {log.map((a) => (
                <li key={a.id} className="grid grid-cols-[7.5rem_1fr] gap-3 text-[0.9375rem]">
                  <span className="tabular text-[0.8125rem] text-muted">{formatSf(a.createdAt)}</span>
                  <span className="min-w-0">
                    <span className="mr-1.5 text-[0.75rem] text-muted">{a.kind}</span>
                    {a.body}
                    {a.minutes ? <span className="text-muted"> ({a.minutes} min)</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function ClinicLinks({
  clinicId,
  clinics,
}: {
  clinicId: string;
  clinics: Awaited<ReturnType<typeof listClinics>>;
}) {
  const c = clinics.find((x) => x.id === clinicId);
  if (!c) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.875rem]">
      {c.phone && <span className="tabular select-all">{c.phone}</span>}
      {c.address && <span className="text-muted">{c.address}</span>}
      {c.website && <a className="underline underline-offset-4" href={c.website} target="_blank" rel="noreferrer">Website</a>}
      {c.onlineBookingUrl && <a className="underline underline-offset-4" href={c.onlineBookingUrl} target="_blank" rel="noreferrer">Book online</a>}
      {c.newPatientFormUrl && <a className="underline underline-offset-4" href={c.newPatientFormUrl} target="_blank" rel="noreferrer">New-patient form</a>}
    </div>
  );
}
