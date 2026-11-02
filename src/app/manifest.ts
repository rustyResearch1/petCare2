import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${site.name}: pet care setup`,
    short_name: site.name,
    description: "Find a vet that's taking new patients, send your pet's records, and book the first visit.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#e6ebe9",
    theme_color: "#e6ebe9",
    categories: ["lifestyle", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Start a setup", url: "/start", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
