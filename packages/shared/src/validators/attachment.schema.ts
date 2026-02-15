import { z } from 'zod';
import { uuidSchema, timestampSchema } from './user.schema.js';

// ─── Attachment Schemas ─────────────────────────────────────

/** Full attachment record as stored in the database */
export const attachmentSchema = z.object({
  id: uuidSchema,
  item_id: uuidSchema,
  drive_file_id: z.string().min(1),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1),
  thumbnail_url: z.string().nullable(),
  web_view_link: z.string().nullable(),
  created_by: uuidSchema,
  created_at: timestampSchema,
});

/** Payload for linking an external URL as an attachment */
export const linkAttachmentSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  fileName: z.string().min(1, 'File name is required').max(255),
  mimeType: z.string().optional(),
});

// ─── Inferred Types ─────────────────────────────────────────

export type AttachmentSchema = z.infer<typeof attachmentSchema>;
export type LinkAttachmentSchema = z.infer<typeof linkAttachmentSchema>;
