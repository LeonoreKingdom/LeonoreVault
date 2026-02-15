import { Router, type IRouter } from 'express';
import multer from 'multer';
import { linkAttachmentSchema } from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as ctrl from './attachment.controller.js';

// ─── Multer Config ──────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_FILES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ─── Routes ─────────────────────────────────────────────────

/**
 * Attachment routes — nested under /api/households/:householdId/items/:itemId/attachments
 */
export const attachmentRouter: IRouter = Router({ mergeParams: true });

attachmentRouter.use(requireAuth);

// POST upload — multipart file upload to Google Drive
attachmentRouter.post(
  '/upload',
  requireRole(['admin', 'member'], 'householdId'),
  upload.array('files', MAX_FILES),
  ctrl.uploadFiles,
);

// POST link — link external URL as attachment
attachmentRouter.post(
  '/link',
  requireRole(['admin', 'member'], 'householdId'),
  validate(linkAttachmentSchema),
  ctrl.linkExternal,
);

// GET list — list all attachments for an item
attachmentRouter.get(
  '/',
  requireRole(['admin', 'member', 'viewer'], 'householdId'),
  ctrl.listAttachments,
);

// DELETE — remove an attachment
attachmentRouter.delete(
  '/:attachmentId',
  requireRole(['admin', 'member'], 'householdId'),
  ctrl.deleteAttachment,
);
