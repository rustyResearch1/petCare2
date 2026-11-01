import Link from "next/link";
import { listRequests } from "@/lib/queries";
import { StatusPill } from "@/components/ops/StatusPill";
import { formatSf, hoursSince, median } from "@/lib/time";
import { site } from "@/lib/site";

export default async function OpsHome() {
  const rows = await listRequests();
  const now = new Date();
  const open = rows.filter((r) => ["new", "shortlisting", "contacting"].includes(r.status));
  const late = open.filter((r) => hoursSince(r.createdAt, now) > site.targetHours);
  const booked = rows.filter((r) => r.bookedAt);
  const hoursToBook = median(booked.map((r) => hoursSince(r.createdAt, new Date(r.bookedAt as string))));
  const minutesPerSetup = median(booked.map((r) => r.minutes).filter((m) => m > 0));

  const stats = [
    { label: "Open requests", value: String(open.length), warn: false },
    { label: `Open past ${site.targetHours}h`, value: String(late.length), warn: late.length > 0 },
    { label: "Booked", value: String(booked.length), warn: false },
    { label: "Median hours to booking", value: hoursToBook == null ? "None yet" : hoursToBook.toFixed(1), warn: hoursToBook != null && hoursToBook > site.targetHours },
    { label: "Median minutes per setup", value: minutesPerSetup == null ? "None yet" : String(Math.round(minutesPerSetup)), warn: false },
  ];

  return (
    <div className="grid gap-8">
      <h1 className="text-[2rem] font-[740] [font-stretch:88%]">Requests</h1>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper px-4 py-3">
            <dt className="text-[0.8125rem] text-muted">{s.label}</dt>
            <dd className={`tabular mt-1 font-display text-[1.75rem] font-[700] [font-stretch:85%] ${s.warn ? "text-danger" : ""}`}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-[620]">No requests yet</p>
          <p className="mt-1 text-muted">
            They appear here as soon as someone submits the form at <Link className="underline" href="/start">/start</Link>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[46rem] text-left text-[0.9375rem]">
            <thead className="text-[0.8125rem] text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-[560]">Owner</th>
                <th className="px-4 py-2.5 font-[560]">Pets</th>
                <th className="px-4 py-2.5 font-[560]">Neighborhood</th>
                <th className="px-4 py-2.5 font-[560]">Status</th>
                <th className="px-4 py-2.5 font-[560]">Requested</th>
                <th className="px-4 py-2.5 text-right font-[560]">Your minutes</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {rows.map((r) => {
                const age = hoursSince(r.createdAt, now);
                const overdue = ["new", "shortlisting", "contacting"].includes(r.status) && age > site.targetHours;
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-fog/60">
                    <td className="px-4 py-3">
                      <Link href={`/ops/r/${r.id}`} className="font-[620] underline-offset-4 hover:underline">
                        {r.ownerName}
                      </Link>
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3">{r.pets}</td>
                    <td className="px-4 py-3">{r.neighborhood}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className={`px-4 py-3 ${overdue ? "font-[620] text-danger" : "text-muted"}`}>
                      {formatSf(r.createdAt)} ({Math.round(age)}h)
                    </td>
                    <td className="px-4 py-3 text-right">{r.minutes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
