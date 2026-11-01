import Link from "next/link";
import { Header, Footer } from "@/components/site/Header";
import { SetupLog } from "@/components/landing/SetupLog";
import { Spotlight } from "@/components/landing/Spotlight";
import { site } from "@/lib/site";
import { FIRST_VISIT_RECORDS, SPECIES_LABEL, type Species } from "@/lib/species";

const STEPS = [
  {
    title: "Tell us about your pet",
    body: "Your neighborhood, your pet, and whatever records you have. Phone photos of paper certificates work.",
  },
  {
    title: "We shortlist and call",
    body: "Clinics near you that see your species. We call to confirm they're taking new patients and what a first exam costs.",
  },
  {
    title: "We do the paperwork",
    body: "We fill in the clinic's new-client form and send your pet's records to the front desk, so nothing is missing on the day.",
  },
  {
    title: "You get a booked visit",
    body: "A confirmed first appointment, plus one page with your pet's records and what's due next.",
  },
];

const SHOWN_SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "reptile", "small_mammal"];

const FAQ = [
  {
    q: "Do you give medical advice?",
    a: "No. We handle finding a clinic, booking and paperwork. The licensed veterinarians at the clinic make every medical decision.",
  },
  {
    q: "Is this for emergencies?",
    a: "No. If your pet needs care today, call a 24-hour emergency animal hospital now. We set up routine care.",
  },
  {
    q: "Who sees my pet's records?",
    a: "Only us and the clinic you approve. Email us and we'll delete everything.",
  },
  {
    q: "How fast is it?",
    a: `We aim to have your first visit booked within ${site.targetHours} hours of your request. The visit date itself depends on the clinic's openings.`,
  },
  {
    q: "Where do you work?",
    a: "Anywhere in San Francisco, from the Outer Sunset to Dogpatch.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="gutter pb-16 pt-10 sm:pt-16">
          <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="min-w-0">
              <h1 className="settle text-[clamp(3rem,9vw,6.25rem)]">
                Your pet&apos;s new vet, booked for you.
              </h1>
              <p className="mt-7 max-w-[34rem] text-[1.1875rem] leading-relaxed text-muted">
                Just moved to San Francisco? We find a clinic that&apos;s taking new patients and sees your dog, cat,
                rabbit or bird. Then we fill in their forms, send your records, and book the first visit.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href="/start" className="btn btn-primary">
                  Start your setup
                </Link>
                <Link href="#how" className="font-[560] underline decoration-line underline-offset-4 hover:decoration-ink">
                  How it works
                </Link>
              </div>
              <p className="mt-4 text-[0.9375rem] text-muted">
                ${site.pricePerPetUsd} per pet, charged only after your first visit is booked.
              </p>
            </div>
            <div className="min-w-0 lg:pt-3">
              <SetupLog />
            </div>
          </div>
        </section>

        {/* How it works: a real sequence, so it is numbered */}
        <section id="how" className="gutter scroll-mt-20 border-t border-line bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-xl text-[clamp(2rem,4.5vw,2.75rem)] font-[720] [font-stretch:88%] leading-[1.02]">
              One request. We handle the phone calls.
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-t-2 border-ink pt-4">
                  <span className="tabular font-display text-[2rem] font-[300] [font-stretch:70%] text-iceplant">
                    {i + 1}
                  </span>
                  <h3 className="mt-1 text-[1.25rem] font-[680] [font-stretch:92%]">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Species */}
        <section className="gutter py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="min-w-0">
              <h2 className="text-[clamp(2rem,4.5vw,2.75rem)] font-[720] [font-stretch:88%] leading-[1.02]">
                Including the pets most clinics turn away.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted">
                Rabbits, birds and reptiles need vets with exotics experience, and those clinics fill up first. We keep
                track of which ones see which species, and which are taking new patients this month.
              </p>
            </div>
            <Spotlight className="min-w-0 rounded-[20px] border border-line">
              <div className="hidden grid-cols-[8.5rem_1fr] gap-x-6 px-5 py-2 text-[0.8125rem] font-[560] text-muted sm:grid sm:px-7">
                <span className="py-2">Pet</span>
                <span className="py-2">What clinics ask for at a first visit</span>
              </div>
              <dl className="divide-y divide-line border-t border-line">
                {SHOWN_SPECIES.map((sp) => (
                  <div key={sp} className="grid gap-1 px-5 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-x-6 sm:px-7">
                    <dt className="font-display text-[1.125rem] font-[680] [font-stretch:90%]">{SPECIES_LABEL[sp]}</dt>
                    <dd className="min-w-0 leading-relaxed text-muted">{FIRST_VISIT_RECORDS[sp]}</dd>
                  </div>
                ))}
              </dl>
            </Spotlight>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="gutter scroll-mt-20 border-t border-line bg-paper py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-[clamp(2rem,4.5vw,2.75rem)] font-[720] [font-stretch:88%] leading-[1.02]">
                One price, paid once the visit is booked.
              </h2>
              <ul className="mt-6 grid max-w-md gap-3 leading-relaxed text-muted">
                <li>If we can&apos;t book a first visit, you pay nothing.</li>
                <li>The clinic bills you directly for the exam itself.</li>
                <li>We&apos;re starting with a small group of San Francisco households.</li>
              </ul>
            </div>
            <div className="flex flex-col items-start gap-5 lg:items-end">
              <p className="font-display leading-none">
                <span className="tabular text-[clamp(4.5rem,12vw,7.5rem)] font-[760] [font-stretch:80%]">
                  ${site.pricePerPetUsd}
                </span>
                <span className="ml-2 text-[1.125rem] font-[500] text-muted">per pet</span>
              </p>
              <Link href="/start" className="btn btn-primary">
                Start your setup
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="gutter py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-[clamp(1.75rem,4vw,2.25rem)] font-[720] [font-stretch:88%]">Questions</h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.0625rem] font-[600]">
                    {f.q}
                    <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[60ch] leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
