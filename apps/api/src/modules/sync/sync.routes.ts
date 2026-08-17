import { Router, type IRouter } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { expensiveMutationRateLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './sync.controller.js';

/**
 * Sync routes — mounted at /api/sync
 */
export const syncRouter: IRouter = Router();

syncRouter.use(requireAuth);

// POST /api/sync — process batched offline mutations
syncRouter.post('/', expensiveMutationRateLimiter, ctrl.sync);
