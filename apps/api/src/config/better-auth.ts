import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '../db/client.js';
import { schema } from '../db/schema.js';

const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.BETTER_AUTH_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (isProduction && (!secret || secret.length < 32)) {
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production');
}

/**
 * Better Auth configuration for the canonical `/api/auth/*` endpoints.
 *
 * The existing `users` table remains the application profile table. Better
 * Auth owns credential accounts, sessions, and verification records in the
 * accompanying tables and maps its user fields onto the existing columns.
 */
export const auth = betterAuth({
  appName: 'LeonoreVault',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  secret: secret ?? 'leonorevault-development-secret-change-me-32',
  trustedOrigins: [process.env.CORS_ORIGIN ?? 'http://localhost:3000'],
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  user: {
    modelName: 'users',
    fields: {
      name: 'displayName',
      image: 'avatarUrl',
      emailVerified: 'emailVerified',
    },
  },
  session: {
    modelName: 'sessions',
  },
  account: {
    modelName: 'accounts',
  },
  verification: {
    modelName: 'verifications',
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  advanced: {
    useSecureCookies: isProduction,
  },
});
