import { loadEnvFile } from 'node:process';
import type { NextConfig } from "next";

// Next resolves `.env*` relative to this app. Load the workspace root `.env`
// for local same-origin API development; Vercel simply skips this file.
try {
  loadEnvFile('../../.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@leonorevault/api', '@leonorevault/shared'],
  typescript: {
    // Type checking is done by `tsc` in CI.
    // Next.js / Turbopack's built-in checker can't resolve type-only
    // re-exports from pnpm workspace packages, so we skip it here.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
