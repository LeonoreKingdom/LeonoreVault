/**
 * Server-only accessors for the shared Turso and Better Auth services.
 * Dynamic imports keep credentials and database clients out of build-time
 * evaluation and let Vercel initialize them per Node.js function instance.
 */
export async function getAuthService() {
  const { auth } = await import('@leonorevault/api/auth');
  return auth;
}

export async function getDatabaseService() {
  const { db } = await import('@leonorevault/api/database');
  return db;
}
