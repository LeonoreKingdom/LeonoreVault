import type { Request, Response, NextFunction } from 'express';
import type {
  CreateHouseholdSchema,
  JoinHouseholdSchema,
  UpdateMemberRoleSchema,
} from '@leonorevault/shared';
import * as householdService from './household.service.js';

/** POST /api/households */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await householdService.createHousehold(
      req.user!.id,
      req.body as CreateHouseholdSchema,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** GET /api/households/:id */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const result = await householdService.getHousehold(id, req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** POST /api/households/:id/invite */
export async function invite(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const result = await householdService.createInvite(id, req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** POST /api/households/join */
export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await householdService.joinHousehold(
      req.user!.id,
      req.body as JoinHouseholdSchema,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** PATCH /api/households/:id/members/:userId */
export async function changeRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0]! : req.params.userId!;
    const result = await householdService.changeMemberRole(
      id,
      userId,
      req.user!.id,
      req.body as UpdateMemberRoleSchema,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** DELETE /api/households/:id/members/:userId */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0]! : req.params.userId!;
    const result = await householdService.removeMember(id, userId, req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}
