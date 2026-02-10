'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@leonorevault/shared';

/**
 * Creates a Supabase client for use in browser (Client Components).
 * Uses environment variables exposed by Next.js (NEXT_PUBLIC_ prefix).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
