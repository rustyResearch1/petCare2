"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { FIRST_VISIT_RECORDS, SPECIES, SPECIES_LABEL, type Species } from "@/lib/species";
import { MAX_PETS, PRIORITY_LABEL, TIME_LABEL, TRAVEL_LABEL } from "@/lib/intake";
import { MAX_RECORDS_PER_PET, MAX_RECORD_BYTES, SUPPORTED_RECORD_TYPES } from "@/lib/records";

type PetDraft = {
  key: number;
  name: string;
  species: Species;
  speciesOther: string;
  breed: string;
  age: string;
  sex: "female" | "male" | "unknown";
  fixed: "yes" | "no" | "unknown";
  medications: string;
  conditions: string;
  insurer: string;
  files: File[];
};

const STEPS = ["You", "Your pets", "Preferences", "Review"] as const;

let petKey = 1;
const newPet = (): PetDraft => ({
  key: petKey++,
  name: "",
  species: "dog",
  speciesOther: "",
  breed: "",
  age: "",
  sex: "unknown",
  fixed: "unknown",
  medications: "",
  conditions: "",
  insurer: "",
  files: [],
});

export function IntakeForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [urgent, setUrgent] = useState(false);

  const [owner, setOwner] = useState({
    name: "",
    email: "",
    phone: "",
    neighborhood: "",
    moveStatus: "moved" as "moved" | "moving",
    moveDate: "",
    referral: "",
  });
  const [pets, setPets] = useState<PetDraft[]>(() => [newPet()]);
  const [prefs, setPrefs] = useState({
    times: [] as string[],
    travel: "any" as "walk" | "transit" | "car" | "any",
    priority: "closest" as "closest" | "soonest" | "lowest_fee",
    clinicType: "any" as "any" | "independent",
    notes: "",
  });
  const [consent, setConsent] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const neighborhoods = useMemo(() => NEIGHBORHOODS.map((n) => n.name).sort(), []);

  function updatePet(key: number, patch: Partial<PetDraft>) {
    setPets((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function validate(s: number): string | null {
    if (s === 0) {
      if (!owner.name.trim()) return "Add your name.";
      if (!/^\S+@\S+\.\S+$/.test(owner.email.trim())) return "Enter an email we can reach you at.";
      if (!owner.neighborhood) return "Pick the neighborhood you live in (or are moving to).";
    }
    if (s === 1) {
      for (const p of pets) {
        if (!p.name.trim()) return "Add a name for each pet.";
        if (p.species === "other" && !p.speciesOther.trim()) return `Tell us what kind of animal ${p.name} is.`;
      }
    }
    if (s === 3 && !consent) return "Please confirm so we can contact clinics for you.";
    return null;
  }

  function go(next: number) {
    if (next > step) {
      const msg = validate(step);
      if (msg) {
        setError(msg);
        return;
      }
    }
    setError(null);
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const msg = validate(0) ?? validate(1) ?? validate(3);
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        owner,
        pets: pets.map(({ key: _k, files: _f, ...p }) => p),
        preferences: prefs,
        consent,
        website: honeypot.current?.value ?? "",
      }),
    );
    pets.forEach((p, i) => p.files.forEach((f) => fd.append(`records-${i}`, f, f.name)));
    try {
      const res = await fetch("/api/intake", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string; token?: string | null };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong on our side. Please try again.");
      if (data.token) router.push(`/p/${data.token}?new=1`);
      else router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the form. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Progress: a real four-step sequence */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0">
            <button
              type="button"
              onClick={() => (i < step ? go(i) : undefined)}
              disabled={i >= step}
              aria-current={i === step ? "step" : undefined}
              className="w-full text-left disabled:cursor-default"
            >
              <span
                className={`block h-1 rounded-full transition-colors ${i <= step ? "bg-iceplant" : "bg-line"}`}
              />
              <span
                className={`mt-2 block truncate text-[0.8125rem] ${i === step ? "font-[640] text-ink" : "text-muted"}`}
              >
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <fieldset className="grid gap-5">
                <legend className="mb-5 font-display text-[1.75rem] font-[720] [font-stretch:88%]">
                  Where are you settling in?
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor="owner-name">Your name</label>
                    <input id="owner-name" className="input" autoComplete="name" value={owner.name}
                      onChange={(e) => setOwner({ ...owner, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="owner-email">Email</label>
                    <input id="owner-email" type="email" className="input" autoComplete="email" value={owner.email}
                      onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="owner-phone">Phone <span className="font-normal text-muted">(optional)</span></label>
                    <input id="owner-phone" type="tel" className="input" autoComplete="tel" value={owner.phone}
                      onChange={(e) => setOwner({ ...owner, phone: e.target.value })} />
                    <span className="hint">Only for confirming appointment times.</span>
                  </div>
                  <div className="field">
                    <label htmlFor="owner-hood">Neighborhood</label>
                    <select id="owner-hood" className="input" value={owner.neighborhood}
                      onChange={(e) => setOwner({ ...owner, neighborhood: e.target.value })}>
                      <option value="">Choose one</option>
                      {neighborhoods.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <span className="label">Have you moved yet?</span>
                  <div className="flex flex-wrap gap-2">
                    {(["moved", "moving"] as const).map((v) => (
                      <button key={v} type="button" className="chip" aria-pressed={owner.moveStatus === v}
                        onClick={() => setOwner({ ...owner, moveStatus: v })}>
                        {v === "moved" ? "Already here" : "Moving soon"}
                      </button>
                    ))}
                  </div>
                </div>
                {owner.moveStatus === "moving" && (
                  <div className="field max-w-xs">
                    <label htmlFor="owner-movedate">Move date</label>
                    <input id="owner-movedate" type="date" className="input" value={owner.moveDate}
                      onChange={(e) => setOwner({ ...owner, moveDate: e.target.value })} />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="owner-referral">How did you hear about us? <span className="font-normal text-muted">(optional)</span></label>
                  <input id="owner-referral" className="input" value={owner.referral}
                    onChange={(e) => setOwner({ ...owner, referral: e.target.value })} />
                </div>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className="grid gap-6">
                <legend className="mb-5 font-display text-[1.75rem] font-[720] [font-stretch:88%]">
                  Tell us about your pets
                </legend>

                <label className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4">
                  <input id="urgent" type="checkbox" className="mt-1 h-4 w-4 accent-[var(--iceplant)]"
                    checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
                  <span className="text-[0.9375rem]">One of my pets is sick or hurt right now</span>
                </label>
                {urgent && (
                  <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-[0.9375rem] leading-relaxed">
                    Please don&apos;t wait for us. Call a 24-hour emergency animal hospital now. We set up routine care,
                    which takes a day or two. You can come back and finish this once your pet has been seen.
                  </p>
                )}

                {pets.map((p, idx) => (
                  <div key={p.key} className="grid gap-5 rounded-2xl border border-line bg-paper p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[1.25rem] font-[700] [font-stretch:90%]">{p.name.trim() || `Pet ${idx + 1}`}</h3>
                      {pets.length > 1 && (
                        <button type="button" className="text-[0.875rem] text-muted underline underline-offset-4"
                          onClick={() => setPets((ps) => ps.filter((x) => x.key !== p.key))}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-name`}>Name</label>
                        <input id={`pet-${p.key}-name`} className="input" value={p.name}
                          onChange={(e) => updatePet(p.key, { name: e.target.value })} />
                      </div>
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-breed`}>Breed <span className="font-normal text-muted">(if you know it)</span></label>
                        <input id={`pet-${p.key}-breed`} className="input" value={p.breed}
                          onChange={(e) => updatePet(p.key, { breed: e.target.value })} />
                      </div>
                    </div>
                    <div className="field">
                      <span className="label">What kind of pet?</span>
                      <div className="flex flex-wrap gap-2">
                        {SPECIES.filter((s) => s !== "ferret").map((s) => (
                          <button key={s} type="button" className="chip" aria-pressed={p.species === s}
                            onClick={() => updatePet(p.key, { species: s })}>
                            {SPECIES_LABEL[s]}
                          </button>
                        ))}
                      </div>
                      {p.species === "other" && (
                        <input aria-label="Kind of animal" className="input mt-2" placeholder="e.g. ferret, bearded dragon, cockatiel"
                          value={p.speciesOther} onChange={(e) => updatePet(p.key, { speciesOther: e.target.value })} />
                      )}
                      <span className="hint">{FIRST_VISIT_RECORDS[p.species]}</span>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-age`}>Age</label>
                        <input id={`pet-${p.key}-age`} className="input" placeholder="e.g. 3 years" value={p.age}
                          onChange={(e) => updatePet(p.key, { age: e.target.value })} />
                      </div>
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-sex`}>Sex</label>
                        <select id={`pet-${p.key}-sex`} className="input" value={p.sex}
                          onChange={(e) => updatePet(p.key, { sex: e.target.value as PetDraft["sex"] })}>
                          <option value="unknown">Not sure</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-fixed`}>Spayed or neutered?</label>
                        <select id={`pet-${p.key}-fixed`} className="input" value={p.fixed}
                          onChange={(e) => updatePet(p.key, { fixed: e.target.value as PetDraft["fixed"] })}>
                          <option value="unknown">Not sure</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-meds`}>Current medications <span className="font-normal text-muted">(optional)</span></label>
                        <textarea id={`pet-${p.key}-meds`} className="input" value={p.medications}
                          onChange={(e) => updatePet(p.key, { medications: e.target.value })} />
                      </div>
                      <div className="field">
                        <label htmlFor={`pet-${p.key}-cond`}>Ongoing conditions <span className="font-normal text-muted">(optional)</span></label>
                        <textarea id={`pet-${p.key}-cond`} className="input" value={p.conditions}
                          onChange={(e) => updatePet(p.key, { conditions: e.target.value })} />
                      </div>
                    </div>
                    <div className="field sm:max-w-sm">
                      <label htmlFor={`pet-${p.key}-ins`}>Pet insurance <span className="font-normal text-muted">(optional)</span></label>
                      <input id={`pet-${p.key}-ins`} className="input" placeholder="Provider name" value={p.insurer}
                        onChange={(e) => updatePet(p.key, { insurer: e.target.value })} />
                    </div>
                    <RecordsPicker files={p.files} onChange={(files) => updatePet(p.key, { files })} id={`pet-${p.key}-records`} />
                  </div>
                ))}
                {pets.length < MAX_PETS && (
                  <button type="button" className="btn btn-quiet justify-self-start" onClick={() => setPets((ps) => [...ps, newPet()])}>
                    Add another pet
                  </button>
                )}
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="grid gap-7">
                <legend className="mb-5 font-display text-[1.75rem] font-[720] [font-stretch:88%]">
                  What works for you?
                </legend>
                <div className="field">
                  <span className="label">When can you usually go?</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(TIME_LABEL).map(([v, label]) => {
                      const on = prefs.times.includes(v);
                      return (
                        <button key={v} type="button" className="chip" aria-pressed={on}
                          onClick={() => setPrefs({ ...prefs, times: on ? prefs.times.filter((t) => t !== v) : [...prefs.times, v] })}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="field">
                  <span className="label">How will you get there?</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(TRAVEL_LABEL).map(([v, label]) => (
                      <button key={v} type="button" className="chip" aria-pressed={prefs.travel === v}
                        onClick={() => setPrefs({ ...prefs, travel: v as typeof prefs.travel })}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="label">What matters most?</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PRIORITY_LABEL).map(([v, label]) => (
                      <button key={v} type="button" className="chip" aria-pressed={prefs.priority === v}
                        onClick={() => setPrefs({ ...prefs, priority: v as typeof prefs.priority })}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="label">Clinic ownership</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="chip" aria-pressed={prefs.clinicType === "any"}
                      onClick={() => setPrefs({ ...prefs, clinicType: "any" })}>No preference</button>
                    <button type="button" className="chip" aria-pressed={prefs.clinicType === "independent"}
                      onClick={() => setPrefs({ ...prefs, clinicType: "independent" })}>Prefer independent clinics</button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="pref-notes">Anything else we should know? <span className="font-normal text-muted">(optional)</span></label>
                  <textarea id="pref-notes" className="input" placeholder="A vet who speaks Spanish, a cat-only clinic, a nervous dog..."
                    value={prefs.notes} onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })} />
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <div className="grid gap-6">
                <h2 className="font-display text-[1.75rem] font-[720] [font-stretch:88%]">Check and send</h2>
                <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line">
                  <Row label="You">{owner.name}, {owner.email}{owner.phone ? `, ${owner.phone}` : ""}</Row>
                  <Row label="Neighborhood">
                    {owner.neighborhood}
                    {owner.moveStatus === "moving" ? ` (moving${owner.moveDate ? ` ${owner.moveDate}` : " soon"})` : ""}
                  </Row>
                  {pets.map((p) => (
                    <Row key={p.key} label={p.name || "Pet"}>
                      {p.species === "other" ? p.speciesOther : SPECIES_LABEL[p.species]}
                      {p.breed ? `, ${p.breed}` : ""}{p.age ? `, ${p.age}` : ""}.{" "}
                      {p.files.length ? `${p.files.length} record file${p.files.length > 1 ? "s" : ""}` : "No records uploaded"}
                    </Row>
                  ))}
                  <Row label="Preferences">
                    {[prefs.times.map((t) => TIME_LABEL[t]).join(", ") || "Any time", TRAVEL_LABEL[prefs.travel], PRIORITY_LABEL[prefs.priority]].join("; ")}
                  </Row>
                </dl>
                <label className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4">
                  <input id="consent" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--iceplant)]"
                    checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span className="text-[0.9375rem] leading-relaxed">
                    You can contact clinics for me and share my pet&apos;s records with the clinic I approve. I understand
                    this is a booking service, not veterinary advice.
                  </span>
                </label>
                <p className="text-[0.9375rem] text-muted">
                  Nothing is charged now. We&apos;ll email you at {owner.email || "your address"} once a visit is booked.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Honeypot */}
        <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[0.9375rem]">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" className="btn btn-quiet" onClick={() => go(step - 1)} disabled={submitting}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => go(step + 1)}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Sending..." : "Send my request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 bg-paper px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-[0.875rem] text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function RecordsPicker({ id, files, onChange }: { id: string; files: File[]; onChange: (f: File[]) => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="field">
      <label htmlFor={id}>Records <span className="font-normal text-muted">(optional, but it helps)</span></label>
      <span className="hint">
        Vaccine certificates, past invoices or visit summaries. PDFs or phone photos, up to {MAX_RECORDS_PER_PET} files.
      </span>
      <label
        htmlFor={id}
        className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-fog/50 px-4 py-6 text-center hover:border-ink"
      >
        <span className="font-[600]">Choose files</span>
        <span className="text-[0.8125rem] text-muted">PDF, JPG, PNG or WebP, 10 MB each</span>
      </label>
      <input
        id={id}
        type="file"
        multiple
        accept={SUPPORTED_RECORD_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          const ok: File[] = [];
          let msg: string | null = null;
          for (const f of picked) {
            if (!(SUPPORTED_RECORD_TYPES as readonly string[]).includes(f.type)) msg = `${f.name} isn't a PDF or image we can read.`;
            else if (f.size > MAX_RECORD_BYTES) msg = `${f.name} is over 10 MB.`;
            else ok.push(f);
          }
          const next = [...files, ...ok].slice(0, MAX_RECORDS_PER_PET);
          if (files.length + ok.length > MAX_RECORDS_PER_PET) msg = `Up to ${MAX_RECORDS_PER_PET} files per pet.`;
          setProblem(msg);
          onChange(next);
          e.target.value = "";
        }}
      />
      {problem && <span className="text-[0.8125rem] text-danger">{problem}</span>}
      {files.length > 0 && (
        <ul className="mt-1 grid gap-1.5">
          {files.map((f, i) => (
            <li key={f.name + i} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-[0.875rem]">
              <span className="min-w-0 truncate">{f.name}</span>
              <button type="button" className="shrink-0 text-muted underline underline-offset-4"
                onClick={() => onChange(files.filter((_, j) => j !== i))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
