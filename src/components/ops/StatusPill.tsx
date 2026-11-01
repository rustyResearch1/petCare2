import type { RequestStatus } from "@/lib/db/schema";

const STYLE: Record<RequestStatus, string> = {
  new: "bg-iceplant/12 text-iceplant",
  shortlisting: "bg-amber/15 text-amber",
  contacting: "bg-amber/15 text-amber",
  booked: "bg-seaglass/15 text-seaglass",
  done: "bg-line/60 text-muted",
  cancelled: "bg-line/60 text-muted line-through",
};
const LABEL: Record<RequestStatus, string> = {
  new: "New",
  shortlisting: "Shortlisting",
  contacting: "Contacting",
  booked: "Booked",
  done: "Done",
  cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-[600] ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}

export function AcceptingPill({ value }: { value: "yes" | "no" | "unknown" }) {
  const cls =
    value === "yes" ? "bg-seaglass/15 text-seaglass" : value === "no" ? "bg-danger/12 text-danger" : "bg-line/60 text-muted";
  const label = value === "yes" ? "Accepting" : value === "no" ? "Full" : "Unknown";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.75rem] font-[600] ${cls}`}>{label}</span>;
}
