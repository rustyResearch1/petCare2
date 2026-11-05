import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { stripe, stripeConfigured } from "@/lib/payments";
import { baseUrl } from "@/lib/email";
import { site } from "@/lib/site";

export const runtime = "nodejs";

/** Form POST from the owner page: starts Stripe Checkout for a booked setup. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return new Response("Payments aren't set up yet.", { status: 503 });
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const db = await getDb();
  const [row] = await db
    .select({ request: schema.setupRequests, email: schema.owners.email })
    .from(schema.setupRequests)
    .innerJoin(schema.owners, eq(schema.owners.id, schema.setupRequests.ownerId))
    .where(eq(schema.setupRequests.token, token));
  if (!row) return new Response("Not found", { status: 404 });
  const back = `${baseUrl()}/p/${token}`;
  if (row.request.paidAt) return Response.redirect(`${back}?paid=1`, 303);
  if (row.request.status !== "booked" && row.request.status !== "done") return Response.redirect(back, 303);

  const pets = await db.select({ id: schema.pets.id }).from(schema.pets).where(eq(schema.pets.requestId, row.request.id));
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: row.email,
    line_items: [
      {
        quantity: Math.max(1, pets.length),
        price_data: {
          currency: "usd",
          unit_amount: site.pricePerPetUsd * 100,
          product_data: { name: `${site.name} vet setup`, description: "Clinic search, paperwork and first-visit booking, per pet" },
        },
      },
    ],
    metadata: { requestId: row.request.id },
    success_url: `${back}?paid=1`,
    cancel_url: back,
  });
  await db.update(schema.setupRequests).set({ stripeSessionId: session.id }).where(eq(schema.setupRequests.id, row.request.id));
  return Response.redirect(session.url as string, 303);
}
