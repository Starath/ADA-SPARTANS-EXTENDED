import type { NextConfig } from "next";

const config: NextConfig = {
  webpack: (cfg, { isServer }) => {
    if (isServer) {
      // webgazer accesses window/document at module level — keep it out of server bundle
      const existing = Array.isArray(cfg.externals)
        ? cfg.externals
        : cfg.externals
        ? [cfg.externals]
        : [];
      cfg.externals = [...existing, "webgazer"];
    }
    cfg.resolve.fallback = {
      ...cfg.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
    };
    return cfg;
  },
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
};

export default config;
