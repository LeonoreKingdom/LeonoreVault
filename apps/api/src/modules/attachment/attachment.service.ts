import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';
import { MAX_ATTACHMENTS_PER_ITEM } from '@leonorevault/shared';
import type { LinkAttachmentSchema } from '@leonorevault/shared';

// ─── Constants ───────────────────────────────────────────────

const STORAGE_BUCKET = 'attachments';

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

async function assertItemInHousehold(itemId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('items')
    .select('id')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    logger.error(
      { error: error.message, itemId, householdId },
      'Failed to validate item for attachment',
    );
    throw new AppError(500, 'Failed to validate item', 'INTERNAL_ERROR');
  }
  if (!data) throw new AppError(404, 'Item not found', 'NOT_FOUND');
}

async function getAttachmentCount(itemId: string) {
  const { count, error } = await supabaseAdmin
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', itemId);

  if (error) {
    logger.error({ error: error.message, itemId }, 'Failed to count item attachments');
    throw new AppError(500, 'Failed to check attachment limit', 'INTERNAL_ERROR');
  }
  return count ?? 0;
}

async function assertAttachmentCapacity(itemId: string, additionalCount: number) {
  const currentCount = await getAttachmentCount(itemId);
  if (currentCount + additionalCount > MAX_ATTACHMENTS_PER_ITEM) {
    throw new AppError(
      400,
      `An item can have at most ${MAX_ATTACHMENTS_PER_ITEM} attachments`,
      'ATTACHMENT_LIMIT',
    );
  }
}

function safeFileName(fileName: string) {
  const safe = fileName.replace(/[\\/\0]/g, '_').trim();
  return (safe || 'upload').slice(0, 255);
}

// ─── Upload Files to Supabase Storage ───────────────────────

/**
 * Uploads files to Supabase Storage and creates attachment records.
 */
export async function uploadFiles(
  householdId: string,
  itemId: string,
  userId: string,
  files: Express.Multer.File[],
): Promise<Attachment[]> {
  await assertItemInHousehold(itemId, householdId);

  await assertAttachmentCapacity(itemId, files.length);

  const results: Attachment[] = [];
  const uploadedPaths: string[] = [];
  const createdAttachmentIds: string[] = [];

  try {
    for (const file of files) {
      // Build a unique storage path: householdId/itemId/uuid_originalname
      const fileName = safeFileName(file.originalname);
      const uniqueName = `${randomUUID()}_${fileName}`;
      const storagePath = `${householdId}/${itemId}/${uniqueName}`;
      uploadedPaths.push(storagePath);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        logger.error(
          { error: uploadError, fileName: file.originalname },
          'Supabase Storage upload failed',
        );
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Build thumbnail URL for images (Supabase image transformations)
      const thumbnailUrl = file.mimetype.startsWith('image/')
        ? `${publicUrl}?width=200&height=200&resize=contain`
        : null;

      // Insert into DB — reuse drive_file_id column for storage path
      const { data, error } = await supabaseAdmin
        .from('attachments')
        .insert({
          item_id: itemId,
          drive_file_id: storagePath,
          file_name: fileName,
          mime_type: file.mimetype,
          thumbnail_url: thumbnailUrl,
          web_view_link: publicUrl,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error({ error, fileName: file.originalname }, 'Failed to insert attachment');
        throw new Error(error.message);
      }

      createdAttachmentIds.push(data.id as string);
      results.push(toCamelCase(data));
    }
  } catch (err: unknown) {
    logger.error({ err, step: 'uploadFiles', itemId }, 'File upload failed');

    if (createdAttachmentIds.length > 0) {
      await supabaseAdmin.from('attachments').delete().in('id', createdAttachmentIds);
    }
    if (uploadedPaths.length > 0) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
    }

    if (err instanceof AppError) throw err;
    throw new AppError(502, 'Failed to upload attachment', 'UPLOAD_FAILED');
  }

  return results;
}

// ─── Link External URL ─────────────────────────────────────

/**
 * Creates an attachment record for an external URL (no file upload).
 */
export async function linkExternalAttachment(
  householdId: string,
  itemId: string,
  userId: string,
  payload: LinkAttachmentSchema,
): Promise<Attachment> {
  await assertItemInHousehold(itemId, householdId);
  await assertAttachmentCapacity(itemId, 1);

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

  if (error) {
    logger.error({ error: error.message, itemId }, 'Failed to link attachment');
    throw new AppError(500, 'Failed to link attachment', 'INTERNAL_ERROR');
  }
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
export async function getAttachments(itemId: string, householdId: string): Promise<Attachment[]> {
  await assertItemInHousehold(itemId, householdId);

  const { data, error } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error: error.message, itemId }, 'Failed to list attachments');
    throw new AppError(500, 'Failed to list attachments', 'INTERNAL_ERROR');
  }
  return (data || []).map(toCamelCase);
}

// ─── Delete Attachment ──────────────────────────────────────

/**
 * Deletes an attachment from DB and attempts to delete from Supabase Storage.
 */
export async function removeAttachment(
  attachmentId: string,
  householdId: string,
): Promise<{ deleted: true; storageFileDeleted: boolean }> {
  // 1. Fetch the record
  const { data: attachment, error: fetchErr } = await supabaseAdmin
    .from('attachments')
    .select('drive_file_id,item_id')
    .eq('id', attachmentId)
    .single();

  if (fetchErr || !attachment) throw new AppError(404, 'Attachment not found', 'NOT_FOUND');

  await assertItemInHousehold(attachment.item_id as string, householdId);

  // 2. Delete from DB
  const { error: deleteErr } = await supabaseAdmin
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteErr) {
    logger.error({ error: deleteErr.message, attachmentId }, 'Failed to delete attachment');
    throw new AppError(500, 'Failed to delete attachment', 'INTERNAL_ERROR');
  }

  // 3. Attempt to delete from Supabase Storage (non-blocking)
  let storageFileDeleted = false;
  try {
    const storagePath = attachment.drive_file_id;
    // Only attempt storage delete if it looks like a storage path (not a URL)
    if (storagePath && !storagePath.startsWith('http')) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      if (!removeError) storageFileDeleted = true;
    }
  } catch (err) {
    // Non-blocking — the DB record is already deleted
    logger.warn({ err, attachmentId }, 'Failed to delete file from Supabase Storage');
  }

  return { deleted: true, storageFileDeleted };
}
