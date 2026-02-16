import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Type checking is done by `tsc` in CI.
    // Next.js / Turbopack's built-in checker can't resolve type-only
    // re-exports from pnpm workspace packages, so we skip it here.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
