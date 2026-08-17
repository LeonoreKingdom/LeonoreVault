import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: '../../.env' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:./data/leonorevault.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
