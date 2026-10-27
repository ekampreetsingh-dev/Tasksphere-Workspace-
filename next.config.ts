import type { NextConfig } from "next";

/* A chrome-extension:// popup can only load static files, so the extension
   build exports the route tree instead of shipping a Node server. */
const isExtension = process.env.BUILD_TARGET === "extension";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isExtension
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
