import { Router, type IRouter } from 'express';
import { createLocationSchema, updateLocationSchema } from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as ctrl from './location.controller.js';

/**
 * Location routes — nested under /api/households/:householdId/locations
 */
export const locationRouter: IRouter = Router({ mergeParams: true });

locationRouter.use(requireAuth);

locationRouter.get('/', requireRole(['admin', 'member', 'viewer'], 'householdId'), ctrl.getTree);
locationRouter.post('/', requireRole(['admin', 'member'], 'householdId'), validate(createLocationSchema), ctrl.create);
locationRouter.patch('/:id', requireRole(['admin', 'member'], 'householdId'), validate(updateLocationSchema), ctrl.update);
locationRouter.delete('/:id', requireRole(['admin'], 'householdId'), ctrl.remove);
