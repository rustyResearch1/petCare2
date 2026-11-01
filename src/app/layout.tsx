import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${site.name}: a vet for your pet in ${site.city}`, template: `%s | ${site.name}` },
  description:
    "Just moved to San Francisco? We find a clinic that's taking new patients, fill in the forms, send your pet's records and book the first visit.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6ebe9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e181c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
