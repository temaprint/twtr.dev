import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 loads a native .node binding dynamically — make sure the
  // standalone build traces it into server.js dependencies.
  outputFileTracingIncludes: {
    "/**": ["node_modules/better-sqlite3/build/Release/**"],
  },
};

export default nextConfig;
