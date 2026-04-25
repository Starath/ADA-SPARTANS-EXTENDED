import type { NextConfig } from "next";

const config: NextConfig = {
  webpack: (cfg) => {
    // webgazer and pdfjs are browser-only
    cfg.resolve.fallback = {
      ...cfg.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };
    return cfg;
  },
  // Keep claude-agent-sdk out of the Next.js bundle (it's Node-only)
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
};

export default config;
