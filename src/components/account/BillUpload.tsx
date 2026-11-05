"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_RECORD_BYTES, SUPPORTED_RECORD_TYPES } from "@/lib/records";

export function BillUpload({ petNames }: { petNames: string[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [pet, setPet] = useState(petNames[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return setError("Add a photo or PDF of the invoice first.");
    setBusy(true);
    setError(null);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f, f.name));
    if (pet) fd.set("petName", pet);
    const res = await fetch("/api/bills", { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !data.id) {
      setBusy(false);
      return setError(data.error ?? "Upload failed. Check your connection and try again.");
    }
    router.push(`/account/bills/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-line bg-paper p-5">
      <div className="field">
        <label htmlFor="bill-files">Invoice or estimate</label>
        <label
          htmlFor="bill-files"
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-fog/50 px-4 py-8 text-center hover:border-ink"
        >
          <span className="font-[600]">{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} ready` : "Take a photo or choose a file"}</span>
          <span className="text-[0.8125rem] text-muted">PDF, JPG, PNG or WebP, up to 4 pages, 10 MB each</span>
        </label>
        <input
          id="bill-files"
          type="file"
          multiple
          accept={SUPPORTED_RECORD_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            const bad = picked.find((f) => !(SUPPORTED_RECORD_TYPES as readonly string[]).includes(f.type) || f.size > MAX_RECORD_BYTES);
            setError(bad ? `${bad.name} isn't a supported file or is over 10 MB.` : null);
            setFiles([...files, ...picked.filter((f) => f !== bad)].slice(0, 4));
            e.target.value = "";
          }}
        />
        {files.length > 0 && (
          <ul className="mt-1 grid gap-1.5">
            {files.map((f, i) => (
              <li key={f.name + i} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-[0.875rem]">
                <span className="min-w-0 truncate">{f.name}</span>
                <button type="button" className="shrink-0 text-muted underline underline-offset-4" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {petNames.length > 0 && (
        <div className="field sm:max-w-xs">
          <label htmlFor="bill-pet">Which pet?</label>
          <select id="bill-pet" className="input" value={pet} onChange={(e) => setPet(e.target.value)}>
            {petNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value="">Another pet</option>
          </select>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[0.9375rem]">{error}</p>
      )}
      <button className="btn btn-primary justify-self-start" disabled={busy}>
        {busy ? "Uploading..." : "Check this bill"}
      </button>
    </form>
  );
}
