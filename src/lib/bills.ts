import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { getDb, schema } from "./db/client";
import type { BillFinding, BillItemCategory, BillReport } from "./db/schema";
import { loadUpload } from "./storage";
import { notify, notifyOps } from "./notify";
import { normalizeItem, summarizePrices, type PriceStats } from "./prices";

const MODEL = process.env.EXTRACTION_MODEL || "claude-sonnet-5-5";
const CATEGORIES: BillItemCategory[] = ["exam", "medication", "vaccine", "lab", "imaging", "procedure", "dental", "supply", "fee", "other"];

const ns = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const nn = { anyOf: [{ type: "number" }, { type: "null" }] } as const;

const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_vet_invoice", "clinic_name", "visit_date", "pet_name", "total", "items"],
  properties: {
    is_vet_invoice: { type: "boolean" },
    clinic_name: ns,
    visit_date: { ...ns, description: "YYYY-MM-DD" },
    pet_name: ns,
    total: { ...nn, description: "Invoice total in US dollars" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "category", "quantity", "unit_price", "total_price"],
        properties: {
          description: { type: "string", description: "As written, including drug strength and count" },
          category: { type: "string", enum: CATEGORIES },
          quantity: nn,
          unit_price: { ...nn, description: "US dollars" },
          total_price: { ...nn, description: "US dollars, after any line discount" },
        },
      },
    },
  },
} as const;

type Extracted = {
  is_vet_invoice: boolean;
  clinic_name: string | null;
  visit_date: string | null;
  pet_name: string | null;
  total: number | null;
  items: { description: string; category: BillItemCategory; quantity: number | null; unit_price: number | null; total_price: number | null }[];
};

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "potential_savings", "findings", "next_steps"],
  properties: {
    summary: { type: "string", description: "Two or three plain sentences for the pet owner." },
    potential_savings: { type: "number", description: "Conservative total in US dollars; 0 if none supported." },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "paid", "typical_low", "typical_high", "basis", "cheaper_option", "note", "source_urls"],
        properties: {
          description: { type: "string" },
          paid: nn,
          typical_low: nn,
          typical_high: nn,
          basis: { type: "string", enum: ["our_data", "web", "clinic_list", "none"] },
          cheaper_option: ns,
          note: ns,
          source_urls: { type: "array", items: { type: "string" } },
        },
      },
    },
    next_steps: { type: "array", items: { type: "string" } },
  },
} as const;

const cents = (d: number | null | undefined) => (d == null || Number.isNaN(d) ? null : Math.round(d * 100));
const dollars = (c: number | null) => (c == null ? "unknown" : `$${(c / 100).toFixed(2)}`);

function textOf(res: Anthropic.Message) {
  return res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
}

async function extract(client: Anthropic, files: { filename: string; mimeType: string; bytes: Buffer }[]): Promise<Extracted> {
  const content: Anthropic.ContentBlockParam[] = files.map((f) =>
    f.mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.bytes.toString("base64") }, title: f.filename }
      : { type: "image", source: { type: "base64", media_type: f.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: f.bytes.toString("base64") } },
  );
  content.push({
    type: "text",
    text: "Read this veterinary invoice or estimate. List every line item exactly as written, with prices in US dollars. Do not add, merge or guess items. If this isn't a vet invoice or estimate, set is_vet_invoice to false and return no items.",
  });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content }],
    output_config: { format: { type: "json_schema", schema: EXTRACT_SCHEMA as unknown as Record<string, unknown> } },
  });
  return JSON.parse(textOf(res)) as Extracted;
}

/** Web search for public prices of medications and common services. Returns notes and the pages they came from. */
async function research(client: Anthropic, items: Extracted["items"]) {
  const targets = items
    .filter((i) => ["medication", "vaccine", "exam", "dental", "lab"].includes(i.category))
    .sort((a, b) => (b.total_price ?? 0) - (a.total_price ?? 0))
    .slice(0, 8);
  if (!targets.length) return { notes: "", sources: [] as { title: string; url: string }[] };

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Find current public prices for these items from a San Francisco veterinary invoice:
${targets.map((t, i) => `${i + 1}. ${t.description} (qty ${t.quantity ?? "?"}, paid ${t.total_price != null ? `$${t.total_price}` : "?"})`).join("\n")}

For medications, compare the same drug, strength and count at online pet pharmacies (for example Chewy, 1-800-PetMeds, Costco Pharmacy, Walmart Pet Rx). For exams, vaccines, dental and lab work, look for published prices from San Francisco Bay Area clinics or nonprofits such as the SF SPCA.
Write one line per item: the item, the price range you found, and where. Say plainly when you couldn't find a reliable comparable price. Don't give medical advice.`,
    },
  ];
  const tools: Anthropic.ToolUnion[] = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 6,
      user_location: { type: "approximate", city: "San Francisco", region: "California", country: "US", timezone: "America/Los_Angeles" },
    },
  ];
  let res = await client.messages.create({ model: MODEL, max_tokens: 2500, messages, tools });
  // Long searches can pause; continue the same turn a couple of times.
  for (let i = 0; i < 2 && res.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: res.content });
    res = await client.messages.create({ model: MODEL, max_tokens: 2500, messages, tools });
  }
  const sources = new Map<string, string>();
  for (const block of res.content) {
    if (block.type === "text") {
      for (const c of block.citations ?? []) {
        if (c.type === "web_search_result_location") sources.set(c.url, c.title ?? c.url);
      }
    }
  }
  return { notes: textOf(res), sources: [...sources].map(([url, title]) => ({ url, title })) };
}

async function buildReport(
  client: Anthropic,
  bill: Extracted,
  ourData: Map<string, PriceStats>,
  examFees: { name: string; fee: number }[],
  web: { notes: string; sources: { title: string; url: string }[] },
): Promise<BillReport> {
  const lines = bill.items.map((i) => {
    const stats = ourData.get(normalizeItem(i.description));
    return `- ${i.description} [${i.category}] qty ${i.quantity ?? "?"}, paid ${i.total_price ?? "?"}` +
      (stats ? ` | our invoices: ${stats.count} seen, unit price low ${dollars(stats.lowCents)}, median ${dollars(stats.medianCents)}, high ${dollars(stats.highCents)} across ${stats.clinics} clinic(s)` : "");
  });
  const prompt = `You are writing a price check for a pet owner in San Francisco. Compare what they paid with what others pay. This is price information only.

Rules:
- Compare like with like: same drug, strength and count; same kind of service.
- Never say or imply a test, treatment or medication was unnecessary, and never suggest skipping or changing care. Price only.
- Only give a cheaper_option or a typical range when the data below supports it. Use basis "our_data" for our invoice data, "clinic_list" for clinic exam fees, "web" for the web research, otherwise "none".
- For prescription medications, a cheaper option can mention asking the vet for a written prescription to fill elsewhere.
- potential_savings is conservative: the sum, over supported items only, of what they paid minus the low end of the typical range, never negative.
- source_urls must only contain URLs that appear in the web research sources list.
- next_steps: at most three short, practical actions.

Invoice: clinic ${bill.clinic_name ?? "unknown"}, date ${bill.visit_date ?? "unknown"}, total ${bill.total ?? "unknown"}
Line items (dollars):
${lines.join("\n")}

Exam fees we have confirmed at SF clinics: ${examFees.length ? examFees.map((e) => `${e.name} $${e.fee}`).join("; ") : "none yet"}

Web research notes:
${web.notes || "none"}

Web research sources:
${web.sources.map((s) => `${s.title} | ${s.url}`).join("\n") || "none"}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema: REPORT_SCHEMA as unknown as Record<string, unknown> } },
  });
  const raw = JSON.parse(textOf(res)) as {
    summary: string;
    potential_savings: number;
    findings: { description: string; paid: number | null; typical_low: number | null; typical_high: number | null; basis: BillFinding["basis"]; cheaper_option: string | null; note: string | null; source_urls: string[] }[];
    next_steps: string[];
  };
  const allowed = new Map(web.sources.map((s) => [s.url, s]));
  return {
    summary: raw.summary,
    potentialSavingsCents: Math.max(0, cents(raw.potential_savings) ?? 0),
    nextSteps: raw.next_steps.slice(0, 3),
    findings: raw.findings.map((f) => ({
      description: f.description,
      paidCents: cents(f.paid),
      typicalLowCents: cents(f.typical_low),
      typicalHighCents: cents(f.typical_high),
      basis: f.basis,
      cheaperOption: f.cheaper_option,
      note: f.note,
      sources: f.source_urls.map((u) => allowed.get(u)).filter((s): s is { title: string; url: string } => Boolean(s)),
    })),
  };
}

export function billCheckConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Reads an uploaded invoice, records its line items in the price index, researches prices and writes the report. */
export async function runBillCheck(billCheckId: string): Promise<void> {
  const db = await getDb();
  const [check] = await db.select().from(schema.billChecks).where(eq(schema.billChecks.id, billCheckId));
  if (!check) return;
  const fail = async (message: string) => {
    await db.update(schema.billChecks).set({ status: "failed", error: message.slice(0, 500), updatedAt: new Date() }).where(eq(schema.billChecks.id, billCheckId));
  };
  if (!billCheckConfigured()) return fail("ANTHROPIC_API_KEY is not set");

  try {
    const client = new Anthropic();
    const fileRows = await db.select().from(schema.billFiles).where(eq(schema.billFiles.billCheckId, billCheckId));
    const files = await Promise.all(fileRows.map(async (f) => ({ filename: f.filename, mimeType: f.mimeType, bytes: await loadUpload(f) })));
    const bill = await extract(client, files);
    if (!bill.is_vet_invoice || !bill.items.length) {
      return fail("This doesn't look like a vet invoice or estimate. Try a clearer photo of the itemized bill.");
    }

    // Save line items first: they feed the price index for everyone's future checks.
    await db.delete(schema.billItems).where(eq(schema.billItems.billCheckId, billCheckId));
    await db.insert(schema.billItems).values(
      bill.items.map((i) => ({
        billCheckId,
        description: i.description.slice(0, 300),
        normalized: normalizeItem(i.description),
        category: CATEGORIES.includes(i.category) ? i.category : "other",
        quantity: i.quantity,
        unitCents: cents(i.unit_price) ?? (i.total_price != null && i.quantity ? cents(i.total_price / i.quantity) : null),
        totalCents: cents(i.total_price),
        clinicName: bill.clinic_name,
        visitDate: bill.visit_date,
      })),
    );

    const keys = [...new Set(bill.items.map((i) => normalizeItem(i.description)))];
    const others = await db
      .select({ normalized: schema.billItems.normalized, unitCents: schema.billItems.unitCents, totalCents: schema.billItems.totalCents, clinicName: schema.billItems.clinicName })
      .from(schema.billItems)
      .where(and(inArray(schema.billItems.normalized, keys), ne(schema.billItems.billCheckId, billCheckId)));
    const ourData = summarizePrices(others);
    const examFees = (await db.select({ name: schema.clinics.name, fee: schema.clinics.examFeeUsd }).from(schema.clinics).where(isNotNull(schema.clinics.examFeeUsd)))
      .map((c) => ({ name: c.name, fee: c.fee as number }));
    const web = await research(client, bill.items);
    const report = await buildReport(client, bill, ourData, examFees, web);

    await db
      .update(schema.billChecks)
      .set({
        status: "done",
        report,
        error: null,
        clinicName: bill.clinic_name,
        visitDate: bill.visit_date,
        petName: check.petName ?? bill.pet_name,
        totalCents: cents(bill.total) ?? bill.items.reduce((s, i) => s + (cents(i.total_price) ?? 0), 0),
        updatedAt: new Date(),
      })
      .where(eq(schema.billChecks.id, billCheckId));

    // Items we couldn't price go to the team to call around: the same loop an agent will run later.
    const unpriced = report.findings.filter((f) => f.basis === "none" && (f.paidCents ?? 0) >= 5000);
    if (unpriced.length) {
      await db.insert(schema.tasks).values({
        email: check.email,
        billCheckId,
        kind: "price_check",
        petName: check.petName ?? bill.pet_name,
        details: `Find SF prices for: ${unpriced.map((f) => `${f.description} (paid ${dollars(f.paidCents)})`).join("; ")}`,
        createdBy: "system",
      });
      await notifyOps("Price check needs calls", [`${unpriced.length} item(s) without comparable prices`], "/ops/inbox");
    }

    await notify({
      email: check.email,
      kind: "bill_ready",
      title: report.potentialSavingsCents > 0 ? `Your bill check: up to ${dollars(report.potentialSavingsCents)} in savings` : "Your bill check is ready",
      body: report.summary,
      link: `/account/bills/${billCheckId}`,
      ctaLabel: "See the comparison",
    });
  } catch (e) {
    console.error("[settled:bills] failed", e);
    await fail(e instanceof Error ? e.message : "Unknown error");
  }
}
