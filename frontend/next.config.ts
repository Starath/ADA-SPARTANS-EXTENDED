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
  // PDF.js worker
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  },
};

export default config;
