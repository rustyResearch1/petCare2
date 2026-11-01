const TZ = "America/Los_Angeles";

/** Offset in minutes of America/Los_Angeles from UTC at the given instant (e.g. -420 in PDT). */
function tzOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Converts a `datetime-local` value entered as San Francisco time into an ISO instant. */
export function sfLocalToIso(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) throw new Error("Use the date and time picker.");
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes handle the DST boundary.
  let guess = naive - tzOffsetMinutes(new Date(naive)) * 60000;
  guess = naive - tzOffsetMinutes(new Date(guess)) * 60000;
  return new Date(guess).toISOString();
}

export function hoursSince(d: Date | string, now = new Date()): number {
  return (now.getTime() - new Date(d).getTime()) / 3_600_000;
}

export function formatSf(d: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(d).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  });
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
