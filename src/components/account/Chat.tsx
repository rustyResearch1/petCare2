"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant" | "team"; content: string; at: string };

const STARTERS = [
  "When is my pet's first visit?",
  "Which vaccines are due soon?",
  "Can you book a dental cleaning?",
  "Is my bill higher than usual?",
];

export function Chat({ initial }: { initial: Msg[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, busy]);

  async function send(message: string) {
    const content = message.trim();
    if (!content || busy) return;
    setError(null);
    setBusy(true);
    setText("");
    setMsgs((m) => [...m, { id: `local-${Date.now()}`, role: "user", content, at: new Date().toISOString() }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "The assistant couldn't answer just now.");
      setMsgs((m) => [...m, { id: `reply-${Date.now()}`, role: "assistant", content: data.reply!, at: new Date().toISOString() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60dvh] flex-col rounded-2xl border border-line bg-paper">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.length === 0 && (
          <div className="grid gap-3">
            <p className="text-muted">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip text-left" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={[
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed",
                m.role === "user" ? "bg-ink text-paper" : m.role === "team" ? "border border-seaglass/50 bg-seaglass/10" : "bg-fog",
              ].join(" ")}
            >
              {m.role === "team" && <p className="mb-1 text-[0.75rem] font-[640] text-seaglass">Settled team</p>}
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-fog px-4 py-2.5 text-[0.9375rem] text-muted">Thinking...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="mx-4 mb-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[0.875rem]">{error}</p>}
      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <textarea
          id="chat-input"
          className="input max-h-40 min-h-[44px] flex-1 resize-none"
          rows={1}
          placeholder="Write a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
        />
        <button className="btn btn-primary min-h-[44px] px-4" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
