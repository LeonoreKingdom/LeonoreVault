import { Router, type IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
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
  requireRole(['admin', 'member'], 'householdId'),
  ctrl.generateBatchPdf,
);
