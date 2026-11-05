import Link from "next/link";
import { after } from "next/server";
import { currentUser } from "@/lib/auth";
import { markNotificationsRead, notificationsFor, OWNER_STATUS_LABEL, setupsForEmail } from "@/lib/account";
import { upcomingVaccines } from "@/lib/records";
import { formatSf } from "@/lib/time";
import { SPECIES_LABEL, isSpecies } from "@/lib/species";
import { InstallHint } from "@/components/pwa/InstallHint";

const H2 = "text-[1.25rem] font-[700] [font-stretch:90%]";

export default async function AccountHome() {
  const user = (await currentUser())!;
  const [setups, notes] = await Promise.all([setupsForEmail(user.email), notificationsFor(user.email, 8)]);
  const unread = notes.filter((n) => !n.readAt).length;
  after(() => markNotificationsRead(user.email));
  const first = (user.name || setups[0]?.owner.name || "").split(" ")[0] || user.email.split("@")[0];

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-[clamp(2rem,6vw,2.75rem)] font-[760] [font-stretch:86%] leading-[1]">Hi, {first}</h1>
        <p className="mt-2 text-muted break-all">{user.email}</p>
      </div>

      <InstallHint />

      <section aria-labelledby="updates-h">
        <div className="flex items-baseline justify-between">
          <h2 id="updates-h" className={H2}>Updates</h2>
          {unread > 0 && <span className="rounded-full bg-iceplant/12 px-2.5 py-0.5 text-[0.8125rem] font-[600] text-iceplant">{unread} new</span>}
        </div>
        {notes.length === 0 ? (
          <p className="mt-3 text-muted">Nothing yet. We&apos;ll post updates here and email you.</p>
        ) : (
          <ol className="mt-3 divide-y divide-line rounded-2xl border border-line bg-paper">
            {notes.map((n) => (
              <li key={n.id} className="grid gap-0.5 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={n.readAt ? "font-[560]" : "font-[680]"}>
                    {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-iceplant align-middle" aria-label="New" />}
                    {n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}
                  </p>
                  <span className="tabular shrink-0 text-[0.8125rem] text-muted">{formatSf(n.createdAt)}</span>
                </div>
                <p className="text-[0.9375rem] leading-relaxed text-muted">{n.body.split("\n")[0]}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="setups-h">
        <div className="flex items-baseline justify-between">
          <h2 id="setups-h" className={H2}>Your pets</h2>
          <Link href="/start" className="text-[0.9375rem] underline underline-offset-4">Start a new setup</Link>
        </div>
        {setups.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-line p-6">
            <p className="font-[620]">No setups under this email yet</p>
            <p className="mt-1 text-muted">If you used a different email on the form, sign in with that one. Or start one now.</p>
            <Link href="/start" className="btn btn-primary mt-4">Start your setup</Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-4">
            {setups.map((s) => (
              <article key={s.request.id} className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[1.125rem] font-[680] [font-stretch:92%]">{s.pets.map((p) => p.name).join(" and ")}</h3>
                  <span className="rounded-full bg-fog px-2.5 py-0.5 text-[0.8125rem] font-[600]">{OWNER_STATUS_LABEL[s.request.status]}</span>
                </div>
                {s.request.appointment && (
                  <p className="mt-2 text-[0.9375rem]">
                    First visit {formatSf(s.request.appointment.at, { weekday: "long" })}
                    {s.clinic ? ` at ${s.clinic.name}` : ""}
                  </p>
                )}
                <ul className="mt-3 grid gap-2">
                  {s.pets.map((p) => {
                    const due = upcomingVaccines(p.profile, new Date(), 60);
                    return (
                      <li key={p.id} className="text-[0.9375rem] leading-relaxed">
                        <span className="font-[600]">{p.name}</span>{" "}
                        <span className="text-muted">
                          {p.speciesOther || (isSpecies(p.species) ? SPECIES_LABEL[p.species] : p.species)}
                          {p.breed ? `, ${p.breed}` : ""}
                        </span>
                        {due.length > 0 && (
                          <span className="ml-2 text-amber">{due.map((v) => `${v.name} ${v.overdue ? "overdue" : "due soon"}`).join(", ")}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link href={`/p/${s.request.token}`} className="mt-4 inline-block text-[0.9375rem] font-[600] underline underline-offset-4">
                  Details and records
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className={H2}>Paying a lot for meds or visits?</h2>
          <p className="mt-1 text-muted">Upload an invoice and we&apos;ll show what other SF clinics and pharmacies charge.</p>
        </div>
        <Link href="/account/bills" className="btn btn-primary justify-self-start">Check a bill</Link>
      </section>
    </div>
  );
}
