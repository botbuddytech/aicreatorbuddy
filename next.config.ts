import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@cursor/sdk"],
  // Remotion ships as ESM; Next must transpile it for the Editor Player / web export.
  transpilePackages: [
    "remotion",
    "@remotion/player",
    "@remotion/media",
    "@remotion/web-renderer",
    "@remotion/google-fonts",
    "@remotion/transitions",
  ],
};

export default nextConfig;
