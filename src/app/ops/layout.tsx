import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/site/Header";

export const metadata: Metadata = { title: "Ops", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="gutter border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6">
          <Link href="/ops" className="flex items-baseline gap-2">
            <Wordmark className="text-[1.125rem]" />
            <span className="text-[0.875rem] text-muted">ops</span>
          </Link>
          <nav className="flex gap-4 text-[0.9375rem]">
            <Link href="/ops" className="text-muted hover:text-ink">Requests</Link>
            <Link href="/ops/inbox" className="text-muted hover:text-ink">Inbox</Link>
            <Link href="/ops/clinics" className="text-muted hover:text-ink">Clinics</Link>
          </nav>
        </div>
      </header>
      <main className="gutter pb-16 pt-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
