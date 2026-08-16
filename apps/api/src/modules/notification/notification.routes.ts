import { Router, type IRouter } from 'express';
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
  notificationPreferenceSchema,
} from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './notification.controller.js';

export const notificationRouter: IRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', validate(notificationListQuerySchema, 'query'), ctrl.list);

notificationRouter.put(
  '/preferences',
  validate(notificationPreferenceSchema),
  ctrl.savePreferences,
);

notificationRouter.patch('/:id/read', validate(notificationIdParamSchema, 'params'), ctrl.markRead);
