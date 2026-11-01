import Link from "next/link";
import { site } from "@/lib/site";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[1.375rem] font-[780] [font-stretch:92%] tracking-[-0.02em] ${className}`}>
      {site.name.toLowerCase()}
      <span className="text-iceplant">.</span>
    </span>
  );
}

export function Header({ showCta = true }: { showCta?: boolean }) {
  return (
    <header
      className="gutter sticky z-20 border-b border-line/60 bg-fog/85 backdrop-blur"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
        <Link href="/" aria-label={`${site.name} home`}>
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-5 text-[0.9375rem]">
          <Link href="/#how" className="hidden text-muted hover:text-ink sm:inline">
            How it works
          </Link>
          <Link href="/#pricing" className="hidden text-muted hover:text-ink sm:inline">
            Pricing
          </Link>
          {showCta && (
            <Link href="/start" className="btn btn-primary min-h-10 px-4 py-2 text-[0.9375rem]">
              Start your setup
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="gutter border-t border-line py-10 text-[0.9375rem] text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark className="text-ink" />
          <span>Pet care setup in {site.city}</span>
        </div>
        <p>
          Questions? Email <span className="select-all text-ink">{site.contactEmail}</span>
        </p>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-[0.8125rem] leading-relaxed">
        {site.name} books appointments and handles paperwork. We don&apos;t give veterinary advice; licensed
        veterinarians at the clinic make all medical decisions. If your pet needs care today, call a 24-hour
        emergency animal hospital.
      </p>
    </footer>
  );
}
