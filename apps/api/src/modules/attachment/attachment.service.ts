import { Readable } from 'node:stream';
import { supabaseAdmin } from '../../config/supabase.js';
import { getDriveClient, getOrCreateHouseholdFolder } from '../../config/google.js';
import { logger } from '../../middleware/logger.js';
import type { LinkAttachmentSchema } from '@leonorevault/shared';

// ─── Types ──────────────────────────────────────────────────

interface Attachment {
  id: string;
  itemId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string | null;
  webViewLink: string | null;
  createdBy: string;
  createdAt: string;
}

function toCamelCase(row: Record<string, unknown>): Attachment {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    driveFileId: row.drive_file_id as string,
    fileName: row.file_name as string,
    mimeType: row.mime_type as string,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    webViewLink: (row.web_view_link as string) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

// ─── Upload Files to Google Drive ───────────────────────────

/**
 * Uploads files to Google Drive and creates attachment records.
 */
export async function uploadFilesToDrive(
  householdId: string,
  itemId: string,
  userId: string,
  files: Express.Multer.File[],
): Promise<Attachment[]> {
  const drive = getDriveClient();
  const folderId = await getOrCreateHouseholdFolder(householdId);

  const results: Attachment[] = [];

  for (const file of files) {
    try {
      // Upload to Google Drive
      const driveResponse = await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: Readable.from(file.buffer),
        },
        fields: 'id,webViewLink,thumbnailLink',
      });

      const driveFileId = driveResponse.data.id;
      if (!driveFileId) {
        logger.error({ fileName: file.originalname }, 'Drive upload returned no file ID');
        continue;
      }

      // Make the file readable by anyone with the link
      await drive.permissions.create({
        fileId: driveFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Build thumbnail URL for images
      const thumbnailUrl = file.mimetype.startsWith('image/')
        ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w200`
        : null;

      const webViewLink =
        driveResponse.data.webViewLink ||
        `https://drive.google.com/file/d/${driveFileId}/view`;

      // Insert into DB
      const { data, error } = await supabaseAdmin
        .from('attachments')
        .insert({
          item_id: itemId,
          drive_file_id: driveFileId,
          file_name: file.originalname,
          mime_type: file.mimetype,
          thumbnail_url: thumbnailUrl,
          web_view_link: webViewLink,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error({ error, fileName: file.originalname }, 'Failed to insert attachment');
        // Attempt cleanup: delete from Drive
        await drive.files.delete({ fileId: driveFileId }).catch(() => {});
        throw new Error(error.message);
      }

      results.push(toCamelCase(data));
    } catch (err: any) {
      logger.error({ 
        err, 
        message: err.message,
        step: 'uploadFilesToDrive',
        fileName: file.originalname 
      }, 'File upload failed');
      throw err;
    }
  }

  return results;
}

// ─── Link External URL ─────────────────────────────────────

/**
 * Creates an attachment record for an external URL (no file upload).
 */
export async function linkExternalAttachment(
  itemId: string,
  userId: string,
  payload: LinkAttachmentSchema,
): Promise<Attachment> {
  // Extract a drive file ID or use the URL itself
  const driveFileId = extractDriveId(payload.url) || payload.url;

  const { data, error } = await supabaseAdmin
    .from('attachments')
    .insert({
      item_id: itemId,
      drive_file_id: driveFileId,
      file_name: payload.fileName,
      mime_type: payload.mimeType || 'application/vnd.google-apps.document',
      thumbnail_url: null,
      web_view_link: payload.url,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

/**
 * Extracts Google Drive file ID from a URL if possible.
 */
function extractDriveId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

// ─── List Attachments ───────────────────────────────────────

/**
 * Returns all attachments for an item.
 */
export async function getAttachments(itemId: string): Promise<Attachment[]> {
  const { data, error } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

// ─── Delete Attachment ──────────────────────────────────────

/**
 * Deletes an attachment from DB and attempts to delete from Google Drive.
 */
export async function removeAttachment(
  attachmentId: string,
): Promise<{ deleted: true; driveFileDeleted: boolean }> {
  // 1. Fetch the record
  const { data: attachment, error: fetchErr } = await supabaseAdmin
    .from('attachments')
    .select('drive_file_id')
    .eq('id', attachmentId)
    .single();

  if (fetchErr || !attachment) {
    throw new Error('Attachment not found');
  }

  // 2. Delete from DB
  const { error: deleteErr } = await supabaseAdmin
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteErr) throw new Error(deleteErr.message);

  // 3. Attempt to delete from Google Drive (non-blocking)
  let driveFileDeleted = false;
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId: attachment.drive_file_id });
    driveFileDeleted = true;
  } catch (err) {
    // Non-blocking — the DB record is already deleted
    logger.warn({ err, attachmentId }, 'Failed to delete file from Google Drive');
  }

  return { deleted: true, driveFileDeleted };
}
