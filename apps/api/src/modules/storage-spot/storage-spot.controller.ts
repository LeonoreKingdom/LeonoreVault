import type { Request, Response, NextFunction } from 'express';
import type { CreateStorageSpotSchema, UpdateStorageSpotSchema } from '@leonorevault/shared';
import * as service from './storage-spot.service.js';

const param = (req: Request, name: string) => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0]! : value!;
};

/** GET /api/households/:householdId/storage-spots */
export async function getTree(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getStorageSpotTree(param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** POST /api/households/:householdId/storage-spots */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.createStorageSpot(
      param(req, 'householdId'),
      req.body as CreateStorageSpotSchema,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/households/:householdId/storage-spots/:id */
export async function getDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getStorageSpotDetail(param(req, 'id'), param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/households/:householdId/storage-spots/:id */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.updateStorageSpot(
      param(req, 'id'),
      param(req, 'householdId'),
      req.body as UpdateStorageSpotSchema,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/households/:householdId/storage-spots/:id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.deleteStorageSpot(param(req, 'id'), param(req, 'householdId'));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
