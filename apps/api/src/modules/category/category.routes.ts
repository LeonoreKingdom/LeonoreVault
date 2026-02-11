import { Router, type IRouter } from 'express';
import { createCategorySchema, updateCategorySchema } from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as ctrl from './category.controller.js';

/**
 * Category routes — nested under /api/households/:householdId/categories
 * All routes require auth + household membership.
 * Write operations (create/update/delete) require admin or member role.
 */
export const categoryRouter: IRouter = Router({ mergeParams: true });

categoryRouter.use(requireAuth);

// GET tree — any household member can view
categoryRouter.get('/', requireRole(['admin', 'member', 'viewer'], 'householdId'), ctrl.getTree);

// Write operations — admin + member only
categoryRouter.post('/', requireRole(['admin', 'member'], 'householdId'), validate(createCategorySchema), ctrl.create);
categoryRouter.patch('/:id', requireRole(['admin', 'member'], 'householdId'), validate(updateCategorySchema), ctrl.update);
categoryRouter.delete('/:id', requireRole(['admin'], 'householdId'), ctrl.remove);
