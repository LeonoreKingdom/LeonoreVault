import type { Request, Response, NextFunction } from 'express';
import type {
  CreateItemSchema,
  ReturnItemSchema,
  UpdateItemSchema,
  UpdateItemStatusSchema,
  ItemListQuerySchema,
} from '@leonorevault/shared';
import * as svc from './item.service.js';

const param = (req: Request, name: string) => {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
};

/** GET /api/households/:householdId/items */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listItems(
      param(req, 'householdId'),
      (req.validated ?? req.query) as unknown as ItemListQuerySchema,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/households/:householdId/items/summary */
export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.getItemSummary(param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/households/:householdId/items/:id */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.getItem(param(req, 'id'), param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/households/:householdId/items/:id/activities */
export async function activities(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.getItemActivities(param(req, 'id'), param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/households/:householdId/items */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.createItem(
      param(req, 'householdId'),
      req.user!.id,
      req.body as CreateItemSchema,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/households/:householdId/items/:id */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.updateItem(
      param(req, 'id'),
      param(req, 'householdId'),
      req.user!.id,
      req.body as UpdateItemSchema,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/households/:householdId/items/:id/status */
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.updateItemStatus(
      param(req, 'id'),
      param(req, 'householdId'),
      req.user!.id,
      req.body as UpdateItemStatusSchema,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/households/:householdId/items/:id/return */
export async function returnItem(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.returnItem(
      param(req, 'id'),
      param(req, 'householdId'),
      req.user!.id,
      req.body as ReturnItemSchema,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/households/:householdId/items/:id */
export async function softDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.softDeleteItem(
      param(req, 'id'),
      param(req, 'householdId'),
      req.user!.id,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/households/:householdId/items/:id/restore */
export async function restore(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.restoreItem(param(req, 'id'), param(req, 'householdId'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
