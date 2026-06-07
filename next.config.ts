import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Puppeteer (and its bundled Chromium) out of the server bundle — it must
  // be required at runtime from node_modules, not packed by the bundler.
  serverExternalPackages: ["puppeteer", "puppeteer-core"],
};

export default nextConfig;
