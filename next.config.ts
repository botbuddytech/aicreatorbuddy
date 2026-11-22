import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev assets are blocked for any host other than localhost. 127.0.0.1 and the
  // LAN address still serve the page, but without JS the hero and sections stay hidden.
  // The LAN address comes from DHCP and changes, so match the whole home subnet.
  allowedDevOrigins: ["127.0.0.1", "192.168.1.*"],
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
