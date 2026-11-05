import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/site/Header";
import { AccountNav } from "@/components/account/AccountNav";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/account");
  return (
    <>
      <Header showCta={false} />
      <AccountNav />
      <main className="gutter pt-8" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </>
  );
}
