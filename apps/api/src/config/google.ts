import { google, drive_v3 } from 'googleapis';
import { env } from './env.js';
import { logger } from '../middleware/logger.js';

// ─── Service Account Auth ───────────────────────────────────

let driveClient: drive_v3.Drive | null = null;

/**
 * Returns a Google Drive v3 client authenticated via service account.
 * Throws if service account credentials are not configured.
 *
 * Note: File attachments now use Supabase Storage (see attachment.service.ts).
 * This client is kept for any future Google Drive integrations.
 */
export function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    logger.error({
      hasEmail: !!email,
      hasKey: !!key,
    }, 'Google Drive credentials missing');
    throw new Error('Google Drive service account credentials are not configured');
  }

  logger.info({ email, keyLength: key?.length }, 'Initializing Google Drive client');

  // Handle potential formatting issues with the key from env vars
  let privateKey = key;
  
  // 1. Remove wrapping quotes if present (common copy-paste error)
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // 2. Handle escaped newlines (literal "\\n" -> actual newline)
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  logger.info('Google Drive client initialized');
  return driveClient;
}
