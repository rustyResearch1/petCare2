import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { eq, and, gte, ne } from "drizzle-orm";
import { getDb, schema } from "./db/client";
import type { TaskKind } from "./db/schema";
import { billChecksFor, messagesFor, OWNER_STATUS_LABEL, setupsForEmail } from "./account";
import { rankClinics } from "./match";
import { upcomingVaccines } from "./records";
import { formatSf } from "./time";
import { notifyOps } from "./notify";
import { site } from "./site";

const MODEL = process.env.ASSISTANT_MODEL || "claude-sonnet-5-5";
const MAX_PER_HOUR = 30;

const SYSTEM = `You are the ${site.name} assistant for pet owners in ${site.city}. ${site.name} finds vets that are taking new patients, does the paperwork, books visits, and compares vet bill prices.

What you do:
- Answer questions about the owner's setups, bookings, pets and records using the tools. Look things up rather than guessing.
- Suggest clinics with find_clinics, and say that the team confirms availability by phone.
- When the owner wants something done (book, reschedule, get records sent, a price check, anything that needs a person), use create_request_for_team, then tell them the team will follow up, usually within one business day. You can't book or call clinics yourself yet.
- Explain bill check results.

Limits:
- You are not a veterinarian. Never diagnose, never suggest medications or doses, never say whether a test or treatment was needed. For health questions, say the clinic's vet is the right person to ask, and offer to request an appointment.
- If anything sounds urgent (trouble breathing, collapse, seizures, heavy bleeding, swallowed something toxic, straining to urinate, swollen belly, hit by a car), tell them to call a 24-hour emergency hospital now and list them with emergency_hospitals. Do this before anything else.
- Never invent clinic details, prices or appointment times.

Style: short and plain, two to five sentences, no headings or bullet-point walls. Times are San Francisco time.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_my_setups",
    description: "The owner's setup requests: status, pets, record summaries, vaccines due soon, and any booked visit.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_bill_checks",
    description: "The owner's bill checks: clinic, date, status, potential savings and summary.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "find_clinics",
    description: "Rank San Francisco clinics for a pet. Returns up to 5 with reasons. Availability still needs a phone call.",
    input_schema: {
      type: "object",
      properties: {
        species: { type: "string", enum: ["dog", "cat", "rabbit", "bird", "reptile", "small_mammal", "ferret", "other"] },
        neighborhood: { type: "string", description: "San Francisco neighborhood; defaults to the owner's." },
      },
      required: ["species"],
      additionalProperties: false,
    },
  },
  {
    name: "emergency_hospitals",
    description: "24-hour emergency animal hospitals in San Francisco with phone numbers.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_request_for_team",
    description: "Hand a request to the Settled team, who will act on it and reply in this chat or by email.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["book", "reschedule", "records", "price_check", "question", "other"] },
        pet_name: { type: "string" },
        details: { type: "string", description: "Everything the team needs: what, which pet, preferred times or clinics." },
      },
      required: ["kind", "details"],
      additionalProperties: false,
    },
  },
];

async function runTool(email: string, name: string, input: Record<string, unknown>): Promise<unknown> {
  const db = await getDb();
  if (name === "get_my_setups") {
    const setups = await setupsForEmail(email);
    if (!setups.length) return { setups: [], note: "No setups yet. They can start one at /start." };
    return {
      setups: setups.map((s) => ({
        status: OWNER_STATUS_LABEL[s.request.status] ?? s.request.status,
        neighborhood: s.owner.neighborhood,
        requested: formatSf(s.request.createdAt),
        paid: Boolean(s.request.paidAt),
        booked_visit: s.request.appointment
          ? { when: formatSf(s.request.appointment.at, { weekday: "long" }), clinic: s.clinic?.name, address: s.clinic?.address, phone: s.clinic?.phone, notes: s.request.appointment.notes }
          : null,
        pets: s.pets.map((p) => ({
          name: p.name,
          species: p.speciesOther || p.species,
          breed: p.breed,
          age: p.age,
          records_summary: p.profile?.summary ?? (p.extractionStatus === "none" ? "No records uploaded" : "Records not read yet"),
          vaccines_due_soon: upcomingVaccines(p.profile, new Date(), 60).map((v) => `${v.name} ${v.overdue ? "overdue since" : "due"} ${v.next_due}`),
        })),
      })),
    };
  }
  if (name === "get_bill_checks") {
    const checks = await billChecksFor(email);
    return {
      bill_checks: checks.map((c) => ({
        clinic: c.clinicName,
        date: c.visitDate,
        status: c.status,
        potential_savings: c.report ? `$${(c.report.potentialSavingsCents / 100).toFixed(2)}` : null,
        summary: c.report?.summary ?? c.error,
        link: `/account/bills/${c.id}`,
      })),
    };
  }
  if (name === "find_clinics") {
    const setups = await setupsForEmail(email);
    const prefs = setups[0]?.request.preferences;
    const clinics = await db.select().from(schema.clinics);
    const ranked = rankClinics(
      {
        species: String(input.species ?? "dog"),
        ownerNeighborhood: String(input.neighborhood ?? setups[0]?.owner.neighborhood ?? ""),
        travel: prefs?.travel ?? "any",
        priority: prefs?.priority ?? "closest",
        clinicType: prefs?.clinicType ?? "any",
      },
      clinics,
    );
    return {
      clinics: ranked
        .filter((r) => !r.excluded)
        .slice(0, 5)
        .map((r) => {
          const c = clinics.find((x) => x.id === r.clinic.id)!;
          return { name: c.name, neighborhood: c.neighborhood, phone: c.phone, website: c.website, reasons: r.reasons };
        }),
      note: "New-patient availability changes weekly; the team confirms by phone before booking.",
    };
  }
  if (name === "emergency_hospitals") {
    const rows = await db.select().from(schema.clinics).where(and(eq(schema.clinics.emergency24h, true), ne(schema.clinics.kind, "closed")));
    return { hospitals: rows.map((c) => ({ name: c.name, address: c.address, phone: c.phone, note: c.notes })), advice: "Call ahead so they can prepare." };
  }
  if (name === "create_request_for_team") {
    const setups = await setupsForEmail(email);
    const kind = String(input.kind) as TaskKind;
    const details = String(input.details ?? "").slice(0, 2000);
    const [task] = await db
      .insert(schema.tasks)
      .values({ email, kind, petName: input.pet_name ? String(input.pet_name) : null, details, requestId: setups[0]?.request.id ?? null, createdBy: "assistant" })
      .returning({ id: schema.tasks.id });
    await notifyOps(`Request from ${email}: ${kind}`, [details], "/ops/inbox");
    return { ok: true, request_id: task.id };
  }
  return { error: `Unknown tool ${name}` };
}

/** Turns stored chat history into alternating user/assistant turns, folding team replies into the assistant side. */
function toTurns(history: { role: string; content: string }[]): Anthropic.MessageParam[] {
  const turns: Anthropic.MessageParam[] = [];
  for (const m of history) {
    const role: "user" | "assistant" = m.role === "user" ? "user" : "assistant";
    const text = m.role === "team" ? `[Message from the ${site.name} team] ${m.content}` : m.content;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content = `${last.content as string}\n\n${text}`;
    else turns.push({ role, content: text });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

export function assistantConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Saves the owner's message, gets a reply (running tools as needed) and saves it. Returns the reply text. */
export async function chat(email: string, text: string): Promise<string> {
  const db = await getDb();
  const since = new Date(Date.now() - 3_600_000);
  const recent = await db
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .where(and(eq(schema.messages.email, email), eq(schema.messages.role, "user"), gte(schema.messages.createdAt, since)));
  if (recent.length >= MAX_PER_HOUR) return "You've sent a lot of messages this hour. Please try again a little later, or email us.";

  await db.insert(schema.messages).values({ email, role: "user", content: text.slice(0, 4000) });

  let reply: string;
  if (!assistantConfigured()) {
    await db.insert(schema.tasks).values({ email, kind: "question", details: text.slice(0, 2000), createdBy: "owner" });
    await notifyOps(`Message from ${email}`, [text.slice(0, 500)], "/ops/inbox");
    reply = "Thanks. I've passed this to the team and they'll reply here soon.";
  } else {
    const client = new Anthropic();
    const history = await messagesFor(email, 24);
    const messages = toTurns(history);
    const system = `${SYSTEM}\nToday is ${formatSf(new Date(), { weekday: "long", year: "numeric" })}.`;
    reply = "Sorry, I couldn't finish that. I've let the team know.";
    for (let step = 0; step < 6; step++) {
      const res = await client.messages.create({ model: MODEL, max_tokens: 1200, system, tools: TOOLS, messages });
      if (res.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: res.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of res.content) {
          if (block.type !== "tool_use") continue;
          let out: unknown;
          try {
            out = await runTool(email, block.name, (block.input ?? {}) as Record<string, unknown>);
          } catch (e) {
            out = { error: e instanceof Error ? e.message : "Tool failed" };
          }
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
        }
        messages.push({ role: "user", content: results });
        continue;
      }
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
      if (text) reply = text;
      break;
    }
  }
  await db.insert(schema.messages).values({ email, role: "assistant", content: reply });
  return reply;
}
