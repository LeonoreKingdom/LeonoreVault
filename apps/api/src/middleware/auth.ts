import type { Request, Response, NextFunction } from 'express';
import { getInventoryRepositories } from '../db/repositories/runtime.js';
import { AppError } from './errorHandler.js';
import { logger } from './logger.js';

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function requestHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

/** Validate the Better Auth session and attach the application user to Express. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const hasCookie = Boolean(req.headers.cookie);
    if (!authHeader && !hasCookie) {
      throw new AppError(401, 'Missing authentication credentials', 'UNAUTHORIZED');
    }
    const { auth } = await import('../config/better-auth.js');
    const session = await auth.api.getSession({ headers: requestHeaders(req) });
    if (!session?.user) {
      throw new AppError(401, 'Invalid or expired session', 'UNAUTHORIZED');
    }
    req.user = { id: session.user.id, email: session.user.email };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    logger.debug({ err }, 'Better Auth session validation failed');
    next(new AppError(401, 'Authentication failed', 'UNAUTHORIZED'));
  }
}

export function requireRole(requiredRoles: string[], householdIdParam = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
      const rawParam = req.params[householdIdParam];
      const householdId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      if (!householdId) throw new AppError(400, 'Household ID is required', 'VALIDATION_ERROR');
      const repositories = await getInventoryRepositories();
      const membership = await repositories.memberships.findByUserAndHousehold(
        req.user.id,
        householdId,
      );
      if (!membership) throw new AppError(403, 'You are not a member of this household', 'FORBIDDEN');
      if (!requiredRoles.includes(membership.role)) {
        throw new AppError(403, `Requires one of: ${requiredRoles.join(', ')}`, 'FORBIDDEN');
      }
      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      logger.error({ err }, 'Authorization check failed');
      next(new AppError(500, 'Authorization check failed', 'INTERNAL_ERROR'));
    }
  };
}
