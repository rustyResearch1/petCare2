"use client";

import { useRef } from "react";

/** Wraps content in a surface whose highlight follows the pointer. */
export function Spotlight({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`spotlight ${className}`}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--mx", "-500px");
        ref.current?.style.setProperty("--my", "-500px");
      }}
    >
      {children}
    </div>
  );
}
