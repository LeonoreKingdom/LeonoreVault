import { z } from 'zod';
import { logger } from '../middleware/logger.js';

/**
 * Zod schema that validates and types all required environment variables.
 * The server will fail-fast on startup if any required var is missing or invalid.
 */
const envSchema = z.object({
  // ─── Server ─────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // ─── Supabase ───────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // ─── Google OAuth ───────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:3000/auth/callback'),

  // ─── Google Drive (optional for MVP) ────────────────────
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),

  // ─── Encryption ─────────────────────────────────────────
  ENCRYPTION_KEY: z.string().min(32, 'Must be at least 32 characters'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates environment variables at startup.
 * Logs detailed errors and exits if validation fails.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.fatal('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      logger.fatal(`  → ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

/** Validated, typed environment config — import this instead of using process.env directly */
export const env = loadEnv();
