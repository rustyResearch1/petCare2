import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}

/** How owners pay once a visit is booked: Stripe Checkout, a plain payment link, or not yet set up. */
export function paymentMode(): "checkout" | "link" | "none" {
  if (stripeConfigured()) return "checkout";
  if (process.env.NEXT_PUBLIC_PAYMENT_LINK_URL) return "link";
  return "none";
}
