import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

export const metadata: Metadata = {
  title: { default: `${site.name}: a vet for your pet in ${site.city}`, template: `%s | ${site.name}` },
  description:
    "Just moved to San Francisco? We find a clinic that's taking new patients, fill in the forms, send your pet's records and book the first visit.",
  applicationName: site.name,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6ebe9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e181c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
