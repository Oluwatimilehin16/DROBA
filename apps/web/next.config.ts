import type { NextConfig } from "next";

// Share the repo-root .env with the API in local development
try {
  process.loadEnvFile("../../.env");
} catch {
  /* fine: use apps/web/.env.local or real env vars */
}

const API = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@droba/shared"],
  // The browser talks to the API through the web origin (/api/*), so the refresh cookie is first-party.
  // Old seller URLs now live inside Seller Studio
  async redirects() {
    return [
      { source: "/dashboard", destination: "/studio", permanent: false },
      { source: "/orders/selling", destination: "/studio/orders", permanent: false },
      { source: "/sell", destination: "/studio/new", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API}/api/:path*` },
      { source: "/media/:path*", destination: `${API}/media/:path*` },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "**" }, { protocol: "http", hostname: "localhost" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: { optimizePackageImports: ["@droba/shared"] },
};
export default config;
