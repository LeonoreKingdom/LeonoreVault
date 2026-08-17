import { Router, type IRouter } from 'express';
import { qrResolveQuerySchema } from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { expensiveMutationRateLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './qr.controller.js';

/**
 * QR routes — mounted at /api/households/:householdId/items
 */
export const qrRouter: IRouter = Router({ mergeParams: true });

qrRouter.use(requireAuth);

// GET single QR code for an item
qrRouter.get(
  '/:itemId/qr',
  requireRole(['admin', 'member', 'viewer'], 'householdId'),
  ctrl.generateQr,
);

// POST batch PDF with QR labels
qrRouter.post(
  '/qr-batch',
  expensiveMutationRateLimiter,
  requireRole(['admin', 'member'], 'householdId'),
  ctrl.generateBatchPdf,
);

/** QR resolution routes mounted at /api/households/:householdId/qr. */
export const qrResolveRouter: IRouter = Router({ mergeParams: true });

qrResolveRouter.use(requireAuth);
qrResolveRouter.get(
  '/resolve',
  requireRole(['admin', 'member', 'viewer'], 'householdId'),
  validate(qrResolveQuerySchema, 'query'),
  ctrl.resolve,
);
