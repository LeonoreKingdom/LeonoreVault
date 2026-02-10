import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@leonorevault/shared';
import { env } from './env.js';

/**
 * Supabase client for server-side operations (service role).
 * Bypasses RLS — use only in trusted backend code.
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Creates a Supabase client scoped to a specific user's JWT.
 * Respects RLS policies — use for user-facing operations.
 *
 * @param accessToken - The user's Supabase access token from the Authorization header
 */
export function createUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
