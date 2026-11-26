import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app reads live ledger data from SQLite, so we keep the
  // classic dynamic rendering model instead of Cache Components. With Cache
  // Components on, synchronous SQLite reads could end up baked into a static
  // shell at build time, which is wrong for financial data.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // JSON backups can be a few MB once there are years of entries.
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
