import { Router, type IRouter } from 'express';
import {
  createItemSchema,
  updateItemSchema,
  updateItemStatusSchema,
  itemListQuerySchema,
} from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as ctrl from './item.controller.js';

/**
 * Item routes — nested under /api/households/:householdId/items
 */
export const itemRouter: IRouter = Router({ mergeParams: true });

itemRouter.use(requireAuth);

// GET list — any member can view (validation on query params)
itemRouter.get(
  '/',
  requireRole(['admin', 'member', 'viewer'], 'householdId'),
  validate(itemListQuerySchema, 'query'),
  ctrl.list,
);

// GET single item
itemRouter.get('/:id', requireRole(['admin', 'member', 'viewer'], 'householdId'), ctrl.getById);

// POST create — admin + member
itemRouter.post(
  '/',
  requireRole(['admin', 'member'], 'householdId'),
  validate(createItemSchema),
  ctrl.create,
);

// PATCH update — admin + member
itemRouter.patch(
  '/:id',
  requireRole(['admin', 'member'], 'householdId'),
  validate(updateItemSchema),
  ctrl.update,
);

// PATCH status transition — admin + member
itemRouter.patch(
  '/:id/status',
  requireRole(['admin', 'member'], 'householdId'),
  validate(updateItemStatusSchema),
  ctrl.updateStatus,
);

// DELETE (soft) — admin + member
itemRouter.delete('/:id', requireRole(['admin', 'member'], 'householdId'), ctrl.softDelete);

// POST restore — admin only
itemRouter.post('/:id/restore', requireRole(['admin'], 'householdId'), ctrl.restore);
