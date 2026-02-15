import type { Request, Response, NextFunction } from 'express';
import type { LinkAttachmentSchema } from '@leonorevault/shared';
import * as svc from './attachment.service.js';

const param = (req: Request, name: string) => {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
};

/** POST /api/households/:householdId/items/:itemId/attachments/upload */
export async function uploadFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: 'At least one file is required' },
      });
      return;
    }

    const result = await svc.uploadFilesToDrive(
      param(req, 'householdId'),
      param(req, 'itemId'),
      req.user!.id,
      files,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/households/:householdId/items/:itemId/attachments/link */
export async function linkExternal(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.linkExternalAttachment(
      param(req, 'itemId'),
      req.user!.id,
      req.body as LinkAttachmentSchema,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/households/:householdId/items/:itemId/attachments */
export async function listAttachments(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.getAttachments(param(req, 'itemId'));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/households/:householdId/items/:itemId/attachments/:attachmentId */
export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.removeAttachment(param(req, 'attachmentId'));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
