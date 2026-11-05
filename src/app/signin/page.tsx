import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/site/Header";
import { SignInForm } from "@/components/account/SignInForm";
import { currentUser, googleConfigured } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  const target = safeNext(next);
  if (await currentUser()) redirect(target);

  return (
    <>
      <Header showCta={false} />
      <main className="gutter pb-24 pt-12">
        <div className="mx-auto max-w-sm">
          <h1 className="text-[clamp(2rem,6vw,2.75rem)] font-[760] [font-stretch:86%] leading-[1]">Sign in</h1>
          <p className="mt-3 leading-relaxed text-muted">
            See your pets, bookings and bill checks in one place. No password: we email you a code.
          </p>
          <div className="mt-8">
            <SignInForm next={target} google={googleConfigured()} defaultEmail={email ?? ""} emailLive={emailConfigured()} />
          </div>
        </div>
      </main>
    </>
  );
}
