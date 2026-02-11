import { Router, type IRouter } from 'express';
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  updateMemberRoleSchema,
} from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './household.controller.js';

export const householdRouter: IRouter = Router();

// All household routes require authentication
householdRouter.use(requireAuth);

// POST /api/households — Create a new household
householdRouter.post('/', validate(createHouseholdSchema), ctrl.create);

// POST /api/households/join — Join via invite code (must be before /:id routes)
householdRouter.post('/join', validate(joinHouseholdSchema), ctrl.join);

// GET /api/households/:id — Get household details
householdRouter.get('/:id', ctrl.getById);

// POST /api/households/:id/invite — Generate invite code
householdRouter.post('/:id/invite', ctrl.invite);

// PATCH /api/households/:id/members/:userId — Change role
householdRouter.patch(
  '/:id/members/:userId',
  validate(updateMemberRoleSchema),
  ctrl.changeRole,
);

// DELETE /api/households/:id/members/:userId — Remove member
householdRouter.delete('/:id/members/:userId', ctrl.remove);
