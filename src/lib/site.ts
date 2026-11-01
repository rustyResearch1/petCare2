// Everything a founder is likely to change in week one lives here.
export const site = {
  name: "Settled",
  city: "San Francisco",
  tagline: "Your pet's new vet, booked for you.",
  pricePerPetUsd: 29,
  targetHours: 48,
  // Shown as plain text on the site. Set this to a real inbox before sharing the link.
  contactEmail: "hello@settled.pet",
  // Optional Stripe Payment Link. When set, the owner page shows a "Pay $29" button once a visit is booked.
  paymentLinkUrl: process.env.NEXT_PUBLIC_PAYMENT_LINK_URL ?? "",
} as const;
