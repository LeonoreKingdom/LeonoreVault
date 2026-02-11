import type { Request, Response, NextFunction } from 'express';
import type { CreateCategorySchema, UpdateCategorySchema } from '@leonorevault/shared';
import * as svc from './category.service.js';

const param = (req: Request, name: string) => {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
};

/** GET /api/households/:householdId/categories */
export async function getTree(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.getCategoryTree(param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** POST /api/households/:householdId/categories */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.createCategory(param(req, 'householdId'), req.body as CreateCategorySchema);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** PATCH /api/households/:householdId/categories/:id */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.updateCategory(param(req, 'id'), param(req, 'householdId'), req.body as UpdateCategorySchema);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** DELETE /api/households/:householdId/categories/:id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.deleteCategory(param(req, 'id'), param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
