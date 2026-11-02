import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Start your setup" };

export default function StartPage() {
  return (
    <>
      <Header showCta={false} />
      <main className="gutter pt-10" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-[760] [font-stretch:86%] leading-[1]">
            Start your setup
          </h1>
          <p className="mt-3 max-w-[34rem] leading-relaxed text-muted">
            About five minutes. We&apos;ll aim to book a first visit within {site.targetHours} hours and email you
            when it&apos;s confirmed.
          </p>
          <div className="mt-10">
            <IntakeForm />
          </div>
        </div>
      </main>
    </>
  );
}
