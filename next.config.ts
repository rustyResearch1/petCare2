import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM and pg uses native bindings when present; keep both out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
