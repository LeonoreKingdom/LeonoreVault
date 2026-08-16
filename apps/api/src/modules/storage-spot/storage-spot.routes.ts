import { Router, type IRouter } from 'express';
import { createStorageSpotSchema, updateStorageSpotSchema } from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as controller from './storage-spot.controller.js';

/** Storage spot routes nested under /api/households/:householdId/storage-spots. */
export const storageSpotRouter: IRouter = Router({ mergeParams: true });

storageSpotRouter.use(requireAuth);

storageSpotRouter.get(
  '/',
  requireRole(['admin', 'member', 'viewer'], 'householdId'),
  controller.getTree,
);
storageSpotRouter.post(
  '/',
  requireRole(['admin', 'member'], 'householdId'),
  validate(createStorageSpotSchema),
  controller.create,
);
storageSpotRouter.get(
  '/:id',
  requireRole(['admin', 'member', 'viewer'], 'householdId'),
  controller.getDetail,
);
storageSpotRouter.patch(
  '/:id',
  requireRole(['admin', 'member'], 'householdId'),
  validate(updateStorageSpotSchema),
  controller.update,
);
storageSpotRouter.delete('/:id', requireRole(['admin'], 'householdId'), controller.remove);
