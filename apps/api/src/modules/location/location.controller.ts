import type { Request, Response, NextFunction } from 'express';
import type { CreateLocationSchema, UpdateLocationSchema } from '@leonorevault/shared';
import * as svc from './location.service.js';

const param = (req: Request, name: string) => {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
};

/** GET /api/households/:householdId/locations */
export async function getTree(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.getLocationTree(param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** POST /api/households/:householdId/locations */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.createLocation(param(req, 'householdId'), req.body as CreateLocationSchema);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** PATCH /api/households/:householdId/locations/:id */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.updateLocation(param(req, 'id'), param(req, 'householdId'), req.body as UpdateLocationSchema);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** DELETE /api/households/:householdId/locations/:id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.deleteLocation(param(req, 'id'), param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
