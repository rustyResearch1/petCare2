"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const TABS = [
  { href: "/account", label: "Home" },
  { href: "/account/bills", label: "Bill check" },
  { href: "/account/assistant", label: "Assistant" },
];

export function AccountNav() {
  const path = usePathname();
  const router = useRouter();
  return (
    <nav className="gutter border-b border-line bg-paper" aria-label="Account">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.href === "/account" ? path === "/account" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-[0.9375rem] ${active ? "border-iceplant font-[620] text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="shrink-0 text-[0.875rem] text-muted underline-offset-4 hover:underline"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
