"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type Entry = { time: string; text: string; tone?: "no" | "yes" | "booked" };

// A worked example. Clinic names are deliberately generic; this is marked "Example" in the UI.
const ENTRIES: Entry[] = [
  { time: "Mon 9:04", text: "Read 2 records: RHDV2 given Mar 2026, next due Mar 2027" },
  { time: "Mon 9:10", text: "Found 11 clinics within 4 km of the Inner Sunset; 3 list rabbits" },
  { time: "Mon 9:31", text: "Clinic A: not taking new exotic patients until January", tone: "no" },
  { time: "Mon 9:44", text: "Clinic B: taking new patients, wellness exam $95", tone: "yes" },
  { time: "Mon 10:02", text: "Filled in Clinic B's new-client form" },
  { time: "Mon 10:05", text: "Sent vaccine records and diet notes to the front desk" },
  { time: "Mon 11:20", text: "Booked Thursday 10:40 am, first wellness exam", tone: "booked" },
];

const STEP_MS = 900;

export function SetupLog() {
  const reduce = useReducedMotion();
  // Server render and reduced motion show the finished log; the client replays progress once.
  const [done, setDone] = useState(ENTRIES.length);

  useEffect(() => {
    if (reduce) return;
    setDone(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDone(i);
      if (i >= ENTRIES.length) window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="beam rounded-[20px] border border-line bg-paper shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--ink)_35%,transparent)]">
      <div className="relative z-[2] flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-[1.125rem] font-[700] [font-stretch:90%]">Miso</p>
          <p className="text-[0.875rem] text-muted">Holland Lop rabbit, 3 years. Moved to the Inner Sunset.</p>
        </div>
        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[0.75rem] text-muted">Example</span>
      </div>
      <ol className="relative z-[2] grid gap-0 px-5 py-3" aria-label="Example setup log">
        {ENTRIES.map((e, i) => {
          const state = i < done ? "done" : i === done ? "active" : "todo";
          return (
            <motion.li
              key={e.time + e.text}
              className="grid grid-cols-[auto_1fr] gap-x-3 py-2"
              initial={false}
              animate={{ opacity: state === "todo" ? 0.45 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="relative mt-[5px] flex h-3 w-3 items-center justify-center">
                <span
                  className={[
                    "h-3 w-3 rounded-full border-2 transition-colors duration-300",
                    state === "done" && e.tone === "booked"
                      ? "border-iceplant bg-iceplant"
                      : state === "done" && e.tone === "no"
                        ? "border-muted bg-transparent"
                        : state === "done"
                          ? "border-seaglass bg-seaglass"
                          : state === "active"
                            ? "pulse-ring border-iceplant bg-transparent"
                            : "border-line bg-transparent",
                  ].join(" ")}
                />
              </span>
              <div className="min-w-0">
                <p
                  className={[
                    "text-[0.9375rem] leading-snug",
                    e.tone === "booked" && state === "done" ? "font-[640] text-ink" : "",
                    e.tone === "no" ? "text-muted line-through decoration-line" : "",
                  ].join(" ")}
                >
                  {e.text}
                </p>
                <p className="tabular text-[0.75rem] text-muted">{e.time}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
