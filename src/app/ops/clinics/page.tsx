import { listClinics } from "@/lib/queries";
import { AcceptingPill } from "@/components/ops/StatusPill";
import { updateClinic } from "../actions";
import { ImportClinics } from "./ImportClinics";
import { formatSf } from "@/lib/time";
import { SPECIES_LABEL, isSpecies } from "@/lib/species";

const KIND_LABEL: Record<string, string> = {
  general: "General practice",
  house_call: "House calls",
  vaccine_clinic: "Vaccine clinic",
  specialty: "Specialist",
  emergency: "Emergency and specialty",
  closed: "Temporarily closed",
};

export default async function ClinicsPage() {
  const clinics = await listClinics();
  const accepting = clinics.filter((c) => c.accepting === "yes").length;
  const exotics = clinics.filter((c) => c.exotics).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-[740] [font-stretch:88%]">Clinics</h1>
          <p className="text-muted">
            {clinics.length} clinics. {accepting} confirmed taking new patients. {exotics} see exotics.
          </p>
        </div>
        <ImportClinics />
      </div>

      {clinics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-[620]">No clinics yet</p>
          <p className="mt-1 text-muted">Import a CSV, or add data/clinics.csv and restart to seed it automatically.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[60rem] text-left text-[0.9375rem]">
            <thead className="text-[0.8125rem] text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-[560]">Clinic</th>
                <th className="px-4 py-2.5 font-[560]">Neighborhood</th>
                <th className="px-4 py-2.5 font-[560]">Sees</th>
                <th className="px-4 py-2.5 font-[560]">Booking</th>
                <th className="px-4 py-2.5 font-[560]">New patients</th>
                <th className="px-4 py-2.5 font-[560]">Update</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-[620]">{c.name}</p>
                    <p className="tabular text-[0.8125rem] text-muted">{[c.phone, c.ownership].filter(Boolean).join(", ")}</p>
                    {c.kind !== "general" && <p className="text-[0.8125rem] text-amber">{KIND_LABEL[c.kind]}</p>}
                    {c.emergency24h && <p className="text-[0.8125rem] text-iceplant">24-hour emergency</p>}
                  </td>
                  <td className="px-4 py-3">{c.neighborhood ?? ""}</td>
                  <td className="px-4 py-3 text-[0.875rem]">
                    {c.speciesSeen.map((s) => (isSpecies(s) ? SPECIES_LABEL[s] : s)).join(", ") || <span className="text-muted">Unknown</span>}
                  </td>
                  <td className="px-4 py-3 text-[0.875rem]">
                    {c.onlineBookingUrl ? (
                      <a className="underline underline-offset-4" href={c.onlineBookingUrl} target="_blank" rel="noreferrer">Online</a>
                    ) : (
                      c.bookingMethod ?? "Unknown"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AcceptingPill value={c.accepting} />
                    {c.acceptingCheckedAt && (
                      <p className="tabular mt-1 text-[0.75rem] text-muted">checked {formatSf(c.acceptingCheckedAt)}</p>
                    )}
                    {c.examFeeUsd != null && <p className="tabular text-[0.8125rem]">Exam ${c.examFeeUsd}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateClinic} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="clinicId" value={c.id} />
                      <select name="accepting" defaultValue={c.accepting} className="input min-h-9 w-auto py-1" aria-label={`New patients at ${c.name}`}>
                        <option value="unknown">Unknown</option>
                        <option value="yes">Accepting</option>
                        <option value="no">Full</option>
                      </select>
                      <input name="examFee" defaultValue={c.examFeeUsd ?? ""} inputMode="numeric" placeholder="Exam $" className="input min-h-9 w-24 py-1" aria-label={`Exam fee at ${c.name}`} />
                      <button className="btn btn-quiet min-h-9 px-3 py-1 text-[0.875rem]">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
