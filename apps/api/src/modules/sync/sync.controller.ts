import type { Request, Response, NextFunction } from 'express';
import * as svc from './sync.service.js';

/**
 * POST /api/sync
 * Accept batched offline mutations and process with last-write-wins.
 */
export async function sync(req: Request, res: Response, next: NextFunction) {
  try {
    const { householdId, mutations } = req.body as {
      householdId: string;
      mutations: Array<{
        type: 'create' | 'update' | 'delete';
        table: string;
        entityId: string;
        payload: Record<string, unknown>;
        updatedAt: string;
      }>;
    };

    if (!householdId || !mutations || !Array.isArray(mutations)) {
      res.status(400).json({
        success: false,
        error: { message: 'householdId and mutations array are required' },
      });
      return;
    }

    if (mutations.length > 100) {
      res.status(400).json({
        success: false,
        error: { message: 'Maximum 100 mutations per sync batch' },
      });
      return;
    }

    const result = await svc.processSyncBatch(householdId, req.user!.id, mutations);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
