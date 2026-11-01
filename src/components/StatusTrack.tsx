import type { RequestStatus } from "@/lib/db/schema";

const TRACK: { key: RequestStatus; label: string; detail: string }[] = [
  { key: "new", label: "Received", detail: "We have your details and records." },
  { key: "shortlisting", label: "Shortlisting", detail: "Finding clinics near you that see your pet." },
  { key: "contacting", label: "Calling clinics", detail: "Confirming who is taking new patients." },
  { key: "booked", label: "Booked", detail: "Your first visit is confirmed." },
];

export function StatusTrack({ status }: { status: RequestStatus }) {
  const current = status === "done" ? TRACK.length - 1 : TRACK.findIndex((t) => t.key === status);
  return (
    <ol className="grid gap-0">
      {TRACK.map((t, i) => {
        const state = i < current ? "done" : i === current ? "now" : "later";
        return (
          <li key={t.key} className="grid grid-cols-[auto_1fr] gap-x-4">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                  state === "done" ? "border-seaglass bg-seaglass" : state === "now" ? "border-iceplant bg-iceplant" : "border-line",
                ].join(" ")}
              />
              {i < TRACK.length - 1 && <span className={`w-0.5 flex-1 ${i < current ? "bg-seaglass" : "bg-line"}`} />}
            </div>
            <div className="pb-6">
              <p className={state === "later" ? "text-muted" : "font-[640]"}>{t.label}</p>
              {state !== "later" && <p className="text-[0.9375rem] text-muted">{t.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
