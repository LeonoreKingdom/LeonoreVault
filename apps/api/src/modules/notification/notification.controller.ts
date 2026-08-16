import type { Request, Response, NextFunction } from 'express';
import type {
  NotificationIdParamSchema,
  NotificationListQuerySchema,
  NotificationPreferenceSchema,
} from '@leonorevault/shared';
import * as svc from './notification.service.js';

const param = (req: Request, name: string) => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0]! : value!;
};

/** GET /api/notifications */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listNotifications(
      req.user!.id,
      (req.validated ?? req.query) as unknown as NotificationListQuerySchema,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const params = (req.validated ?? req.params) as unknown as NotificationIdParamSchema;
    const result = await svc.markNotificationRead(params.id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/notifications/preferences */
export async function savePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.saveNotificationPreferences(
      req.user!.id,
      req.body as NotificationPreferenceSchema,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
