import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, schema } from "@/lib/db/client";
import { stripe, stripeConfigured } from "@/lib/payments";
import { notify, notifyOps } from "@/lib/notify";

export const runtime = "nodejs";

/** Stripe calls this after a payment. Set its signing secret as STRIPE_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) return new Response("Payments aren't set up yet.", { status: 503 });
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.requestId;
    if (requestId && session.payment_status === "paid") {
      const db = await getDb();
      const [row] = await db
        .select({ request: schema.setupRequests, email: schema.owners.email })
        .from(schema.setupRequests)
        .innerJoin(schema.owners, eq(schema.owners.id, schema.setupRequests.ownerId))
        .where(eq(schema.setupRequests.id, requestId));
      if (row && !row.request.paidAt) {
        const amount = session.amount_total ?? 0;
        await db
          .update(schema.setupRequests)
          .set({ paidAt: new Date(), paidAmountCents: amount, stripeSessionId: session.id, updatedAt: new Date() })
          .where(eq(schema.setupRequests.id, requestId));
        await db.insert(schema.activity).values({ requestId, kind: "system", body: `Paid $${(amount / 100).toFixed(2)} via Stripe` });
        await notify({
          email: row.email,
          kind: "paid",
          requestId,
          title: "Payment received",
          body: `Thanks. We received $${(amount / 100).toFixed(2)}. Your receipt comes from Stripe separately.`,
          link: `/p/${row.request.token}`,
          sendEmail: false,
        });
        await notifyOps(`Paid $${(amount / 100).toFixed(2)}`, [row.email], `/ops/r/${requestId}`);
      }
    }
  }
  return Response.json({ received: true });
}
