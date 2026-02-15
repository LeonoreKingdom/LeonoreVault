import type { Request, Response, NextFunction } from 'express';
import * as svc from './qr.service.js';

const param = (req: Request, name: string) => {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
};

/** GET /api/households/:householdId/items/:itemId/qr */
export async function generateQr(req: Request, res: Response, next: NextFunction) {
  try {
    const itemId = param(req, 'itemId');
    const format = (req.query.format as string) === 'svg' ? 'svg' : 'png';
    const size = Math.min(1024, Math.max(64, Number(req.query.size) || 256));

    const { data, contentType } = await svc.generateQrCode(itemId, format, size);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(data);
  } catch (err) {
    next(err);
  }
}

/** POST /api/households/:householdId/items/qr-batch */
export async function generateBatchPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const householdId = param(req, 'householdId');
    const { itemIds, layout } = req.body as { itemIds: string[]; layout?: string };

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 50) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Provide 1–50 item IDs' },
      });
      return;
    }

    const pdf = await svc.generateBatchPdf(householdId, itemIds, layout);

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-labels-${date}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
