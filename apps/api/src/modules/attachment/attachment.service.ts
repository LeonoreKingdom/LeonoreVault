import { randomUUID } from 'node:crypto';
import type { LinkAttachmentSchema } from '@leonorevault/shared';
import {
  objectStorage,
  R2_SIGNED_URL_TTL_SECONDS,
} from '../../config/object-storage.js';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

const MAX_ATTACHMENTS_PER_ITEM = 10;

interface AttachmentResult {
  id: string;
  itemId: string;
  objectKey: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  webViewLink: string | null;
  createdBy: string;
  createdAt: Date;
}

function mapAttachment(row: Record<string, unknown>): AttachmentResult {
  const bucket = row.bucket as string;
  const objectKey = row.objectKey as string;
  const externalUrl = bucket === 'external' ? objectKey : null;
  const objectUrl = bucket === objectStorage.bucket ? objectStorage.publicUrl(objectKey) : null;
  const thumbnailKey = (row.thumbnailKey as string) ?? null;
  return {
    id: row.id as string,
    itemId: row.itemId as string,
    objectKey,
    bucket,
    fileName: row.fileName as string,
    mimeType: row.mimeType as string,
    thumbnailKey,
    thumbnailUrl: thumbnailKey ? objectStorage.publicUrl(thumbnailKey) : null,
    webViewLink: externalUrl ?? objectUrl,
    createdBy: row.createdBy as string,
    createdAt: row.createdAt as Date,
  };
}

async function mapAttachmentWithUrls(row: Record<string, unknown>): Promise<AttachmentResult> {
  const attachment = mapAttachment(row);
  if (attachment.bucket !== objectStorage.bucket || !objectStorage.isConfigured) {
    return attachment;
  }

  const [webViewLink, thumbnailUrl] = await Promise.all([
    objectStorage.signedUrl(attachment.objectKey, {
      contentType: attachment.mimeType,
      fileName: attachment.fileName,
    }),
    attachment.thumbnailKey
      ? objectStorage.signedUrl(attachment.thumbnailKey, {
          contentType: attachment.mimeType,
          fileName: attachment.fileName,
        })
      : Promise.resolve(null),
  ]);

  return { ...attachment, thumbnailUrl, webViewLink };
}

async function assertItemInHousehold(itemId: string, householdId: string) {
  const repositories = await getInventoryRepositories();
  const item = await repositories.items.findById(itemId, householdId);
  if (!item || item.deletedAt) throw new AppError(404, 'Item not found', 'NOT_FOUND');
}

async function assertAttachmentCapacity(itemId: string, additionalCount: number) {
  const repositories = await getInventoryRepositories();
  const currentCount = await repositories.attachments.countByItem(itemId);
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

export async function uploadFiles(
  householdId: string,
  itemId: string,
  userId: string,
  files: Express.Multer.File[],
): Promise<AttachmentResult[]> {
  await assertItemInHousehold(itemId, householdId);
  await assertAttachmentCapacity(itemId, files.length);
  if (!objectStorage.isConfigured) {
    throw new AppError(503, 'Cloudflare R2 storage is not configured', 'STORAGE_NOT_CONFIGURED');
  }
  const repositories = await getInventoryRepositories();
  const uploadedKeys: string[] = [];
  const created: AttachmentResult[] = [];
  try {
    for (const file of files) {
      const key = `${householdId}/${itemId}/${randomUUID()}_${safeFileName(file.originalname)}`;
      await objectStorage.put(key, file.buffer, file.mimetype);
      uploadedKeys.push(key);
      const row = await repositories.attachments.create({
        itemId,
        bucket: objectStorage.bucket,
        objectKey: key,
        fileName: safeFileName(file.originalname),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        thumbnailKey: null,
        createdBy: userId,
      });
      if (!row) throw new Error('Attachment insert returned no row');
      created.push(await mapAttachmentWithUrls(row as unknown as Record<string, unknown>));
    }
    return created;
  } catch (err) {
    logger.error({ err, itemId }, 'File upload failed');
    for (const row of created) await repositories.attachments.remove(row.id, itemId);
    for (const key of uploadedKeys) {
      try {
        await objectStorage.remove(key);
      } catch (cleanupError) {
        logger.warn({ cleanupError, key }, 'Failed to clean up R2 object after upload failure');
      }
    }
    if (err instanceof AppError) throw err;
    throw new AppError(502, 'Failed to upload attachment', 'UPLOAD_FAILED');
  }
}

export async function linkExternalAttachment(
  householdId: string,
  itemId: string,
  userId: string,
  payload: LinkAttachmentSchema,
): Promise<AttachmentResult> {
  await assertItemInHousehold(itemId, householdId);
  await assertAttachmentCapacity(itemId, 1);
  const repositories = await getInventoryRepositories();
  const row = await repositories.attachments.create({
    itemId,
    bucket: 'external',
    objectKey: payload.url,
    fileName: payload.fileName,
    mimeType: payload.mimeType || 'application/octet-stream',
    sizeBytes: 0,
    thumbnailKey: null,
    createdBy: userId,
  });
  if (!row) throw new AppError(500, 'Failed to link attachment', 'INTERNAL_ERROR');
  return mapAttachment(row as unknown as Record<string, unknown>);
}

export async function getAttachments(itemId: string, householdId: string): Promise<AttachmentResult[]> {
  await assertItemInHousehold(itemId, householdId);
  const repositories = await getInventoryRepositories();
  const rows = await repositories.attachments.listByItem(itemId);
  return Promise.all(
    rows.map((row) => mapAttachmentWithUrls(row as unknown as Record<string, unknown>)),
  );
}

export async function getAttachmentUrl(
  attachmentId: string,
  itemId: string,
  householdId: string,
  variant: 'original' | 'thumbnail' = 'original',
) {
  await assertItemInHousehold(itemId, householdId);
  const repositories = await getInventoryRepositories();
  const attachment = await repositories.attachments.findById(attachmentId);
  if (!attachment || attachment.itemId !== itemId) {
    throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
  }

  if (attachment.bucket === 'external') {
    return { url: attachment.objectKey, expiresIn: null, variant };
  }
  if (attachment.bucket !== objectStorage.bucket || !objectStorage.isConfigured) {
    throw new AppError(503, 'Cloudflare R2 storage is not configured', 'STORAGE_NOT_CONFIGURED');
  }

  const key = variant === 'thumbnail' ? attachment.thumbnailKey : attachment.objectKey;
  if (!key) throw new AppError(404, 'Attachment variant not found', 'NOT_FOUND');

  const url = await objectStorage.signedUrl(key, {
    contentType: attachment.mimeType,
    fileName: attachment.fileName,
  });
  return { url, expiresIn: R2_SIGNED_URL_TTL_SECONDS, variant };
}

export async function removeAttachment(
  attachmentId: string,
  householdId: string,
): Promise<{ deleted: true; storageFileDeleted: boolean }> {
  const repositories = await getInventoryRepositories();
  const attachment = await repositories.attachments.findById(attachmentId);
  if (!attachment) throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
  await assertItemInHousehold(attachment.itemId, householdId);
  const removed = await repositories.attachments.remove(attachmentId, attachment.itemId);
  if (!removed) throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
  let storageFileDeleted = false;
  if (attachment.bucket === objectStorage.bucket && objectStorage.isConfigured) {
    try {
      await objectStorage.remove(attachment.objectKey);
      storageFileDeleted = true;
    } catch (err) {
      logger.warn({ err, attachmentId }, 'Failed to delete R2 object after attachment removal');
    }
  }
  return { deleted: true, storageFileDeleted };
}
