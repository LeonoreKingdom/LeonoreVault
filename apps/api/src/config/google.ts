import { google, drive_v3 } from 'googleapis';
import { env } from './env.js';
import { logger } from '../middleware/logger.js';
import { supabaseAdmin } from './supabase.js';

// ─── Service Account Auth ───────────────────────────────────

let driveClient: drive_v3.Drive | null = null;

/**
 * Returns a Google Drive v3 client authenticated via service account.
 * Throws if service account credentials are not configured.
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
  
  // 2. Handle escaped newlines (literal "\n" -> actual newline)
  privateKey = privateKey.replace(/\\n/g, '\n');

  // Debug log (redacted) to check format
  const lines = privateKey.split('\n');
  logger.info({ 
    lineCount: lines.length, 
    startsWithHeader: privateKey.trim().startsWith('-----BEGIN PRIVATE KEY-----'),
    endsWithFooter: privateKey.trim().endsWith('-----END PRIVATE KEY-----'),
    firstLine: lines[0],
    lastLine: lines[lines.length - 1]
  }, 'Private Key format check');

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  logger.info('Google Drive client initialized');
  return driveClient;
}

// ─── Household Folder Management ────────────────────────────

/**
 * Gets or creates a Google Drive folder for a household.
 * If the household already has a `drive_folder_id`, returns it.
 * Otherwise creates a new folder and saves the ID.
 */
export async function getOrCreateHouseholdFolder(householdId: string): Promise<string> {
  // Check if folder already exists in DB
  const { data: household, error } = await supabaseAdmin
    .from('households')
    .select('drive_folder_id, name')
    .eq('id', householdId)
    .single();

  if (error || !household) {
    throw new Error(`Household ${householdId} not found`);
  }

  if (household.drive_folder_id) {
    return household.drive_folder_id;
  }

  // Create a new folder in Google Drive
  const drive = getDriveClient();
  const folderMetadata: drive_v3.Schema$File = {
    name: `LeonoreVault - ${household.name}`,
    mimeType: 'application/vnd.google-apps.folder',
  };

  // If a root folder is configured (shared from personal drive), create inside it
  if (env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    folderMetadata.parents = [env.GOOGLE_DRIVE_ROOT_FOLDER_ID];
  }

  const folderResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  const folderId = folderResponse.data.id;
  if (!folderId) {
    throw new Error('Failed to create Google Drive folder');
  }

  // Save folder ID to DB
  await supabaseAdmin
    .from('households')
    .update({ drive_folder_id: folderId })
    .eq('id', householdId);

  logger.info({ householdId, folderId }, 'Created Google Drive folder for household');
  return folderId;
}
