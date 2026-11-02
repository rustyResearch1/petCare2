"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "settled:install-hint-dismissed";

/** Offers "add to home screen" on phones: a real install button on Android, instructions on iPhone. */
export function InstallHint() {
  const [mode, setMode] = useState<"none" | "prompt" | "ios">("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (dismissed || standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) setMode("ios");

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setMode("none");
  }

  if (mode === "none") return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
      <p className="min-w-0 flex-1 text-[0.9375rem] leading-snug">
        {mode === "ios" ? (
          <>Keep this page one tap away: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</>
        ) : (
          <>Add Settled to your home screen to check on your setup.</>
        )}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {mode === "prompt" && deferred && (
          <button
            type="button"
            className="btn btn-primary min-h-10 px-4 py-1.5"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice.catch(() => null);
              setDeferred(null);
              setMode("none");
            }}
          >
            Add to home screen
          </button>
        )}
        <button type="button" className="btn btn-quiet min-h-10 px-3 py-1.5" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
