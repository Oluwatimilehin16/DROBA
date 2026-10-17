import type { NextConfig } from "next";

const API = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@droba/shared"],
  // The browser talks to the API through the web origin (/api/*), so the refresh cookie is first-party.
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
