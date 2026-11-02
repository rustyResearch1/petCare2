import type { Metadata } from "next";
import { Wordmark } from "@/components/site/Header";

export const metadata: Metadata = { title: "You're offline" };

export default function Offline() {
  return (
    <main className="gutter grid min-h-dvh place-items-center py-16">
      <div className="max-w-sm">
        <Wordmark />
        <h1 className="mt-6 text-[2rem] font-[740] [font-stretch:88%] leading-[1.05]">You&apos;re offline</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Settled needs a connection to load your setup. Check your signal and try again. If your pet needs care
          right now, call a 24-hour emergency animal hospital.
        </p>
      </div>
    </main>
  );
}
