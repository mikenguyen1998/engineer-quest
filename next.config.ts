import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16's CLI TypeScript config reader cannot parse output in this environment.
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
