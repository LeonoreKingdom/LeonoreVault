import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { schema } from './schema.js';

function getDatabaseConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is required to initialize the SQLite database');
  }
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    throw new Error('TURSO_DATABASE_URL must be a libSQL/SQLite URL, not a PostgreSQL URL');
  }

  return {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
}

export const libsqlClient = createClient(getDatabaseConfig());
export const db = drizzle(libsqlClient, { schema });
