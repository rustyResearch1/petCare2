"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInForm({
  next,
  google,
  defaultEmail,
  emailLive,
}: {
  next: string;
  google: boolean;
  defaultEmail: string;
  emailLive: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter the email you used for your setup.");
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(error.message ?? "We couldn't send a code. Try again in a minute.");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email: email.trim().toLowerCase(), otp: code.trim() });
    if (error) {
      setBusy(false);
      return setError(error.status === 403 || /invalid|expired/i.test(error.message ?? "") ? "That code didn't work. Check it, or send a new one." : error.message ?? "Sign-in failed.");
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {google && (
        <>
          <button
            type="button"
            className="btn btn-quiet w-full"
            disabled={busy}
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-[0.8125rem] text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {step === "email" ? (
        <form onSubmit={sendCode} className="grid gap-4">
          <div className="field">
            <label htmlFor="signin-email">Email</label>
            <input id="signin-email" type="email" className="input" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Sending..." : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-4">
          <p className="text-[0.9375rem] leading-relaxed">
            We sent a 6-digit code to <strong className="break-all">{email}</strong>.
          </p>
          <div className="field">
            <label htmlFor="signin-code">Code</label>
            <input
              id="signin-code"
              className="input tabular tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <div className="flex justify-between text-[0.875rem]">
            <button type="button" className="text-muted underline underline-offset-4" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
              Use a different email
            </button>
            <button type="button" className="text-muted underline underline-offset-4" onClick={() => sendCode()} disabled={busy}>
              Send a new code
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[0.9375rem]">
          {error}
        </p>
      )}
      {!emailLive && (
        <p className="text-[0.8125rem] text-muted">Email sending isn&apos;t connected yet, so codes are written to the server log.</p>
      )}
    </div>
  );
}
