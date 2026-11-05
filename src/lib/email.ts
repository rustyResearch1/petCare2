import "server-only";
import { Resend } from "resend";
import { site } from "./site";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || `${site.name} <onboarding@resend.dev>`;
let resend: Resend | null = null;

export function emailConfigured(): boolean {
  return Boolean(apiKey);
}

export function baseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** One plain, readable layout for every email. */
function render({ heading, lines, cta }: { heading: string; lines: string[]; cta?: { label: string; href: string } }) {
  const text = [heading, "", ...lines, ...(cta ? ["", `${cta.label}: ${cta.href}`] : []), "", `${site.name}, ${site.city}`].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#e6ebe9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14212a">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-weight:800;font-size:20px;margin:0 0 24px">${escape(site.name.toLowerCase())}<span style="color:#b2215f">.</span></p>
<div style="background:#f8faf9;border:1px solid #c9d3d0;border-radius:16px;padding:24px">
<h1 style="font-size:22px;line-height:1.2;margin:0 0 12px">${escape(heading)}</h1>
${lines.map((l) => `<p style="font-size:16px;line-height:1.5;margin:0 0 12px;color:#33444a">${escape(l)}</p>`).join("")}
${cta ? `<p style="margin:20px 0 0"><a href="${escape(cta.href)}" style="display:inline-block;background:#b2215f;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">${escape(cta.label)}</a></p>` : ""}
</div>
<p style="font-size:12px;color:#55666b;margin:16px 4px 0">${escape(site.name)} books appointments and handles paperwork. We don't give veterinary advice. If your pet needs care now, call a 24-hour emergency animal hospital.</p>
</div></body></html>`;
  return { text, html };
}

export type EmailInput = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  cta?: { label: string; href: string };
};

/** Sends an email. Without RESEND_API_KEY it writes the message to the server log instead, so flows still work in testing. */
export async function sendEmail(input: EmailInput): Promise<boolean> {
  const { text, html } = render(input);
  if (!apiKey) {
    console.log(`[settled:email] (not sent, RESEND_API_KEY unset) to=${input.to} subject="${input.subject}"\n${text}`);
    return false;
  }
  resend ??= new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to: input.to, subject: input.subject, text, html });
  if (error) {
    console.error("[settled:email] send failed", error);
    return false;
  }
  return true;
}
