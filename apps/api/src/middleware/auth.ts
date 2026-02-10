import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from './errorHandler.js';
import { logger } from './logger.js';

/**
 * Authenticated user data attached to request by auth middleware.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extend Express Request to include authenticated user.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * JWT authentication middleware.
 * Validates the Bearer token from the Authorization header
 * using Supabase Auth and attaches user data to the request.
 *
 * @throws {AppError} 401 if token is missing, invalid, or expired
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.debug({ error: error?.message }, 'JWT validation failed');
      throw new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Authentication failed', 'UNAUTHORIZED'));
  }
}

/**
 * Role-based authorization middleware factory.
 * Must be used after requireAuth.
 *
 * @param requiredRoles - Roles that are allowed (e.g., ['admin', 'member'])
 * @param householdIdParam - The request param containing the household ID (default: 'id')
 */
export function requireRole(requiredRoles: string[], householdIdParam = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
      }

      const rawParam = req.params[householdIdParam];
      const householdId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
      if (!householdId) {
        throw new AppError(400, 'Household ID is required', 'VALIDATION_ERROR');
      }

      // Look up membership via admin client (bypasses RLS)
      const { data: membership, error } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('household_id', householdId)
        .single();

      if (error || !membership) {
        throw new AppError(403, 'You are not a member of this household', 'FORBIDDEN');
      }

      if (!requiredRoles.includes(membership.role)) {
        throw new AppError(403, `Requires one of: ${requiredRoles.join(', ')}`, 'FORBIDDEN');
      }

      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      next(new AppError(500, 'Authorization check failed', 'INTERNAL_ERROR'));
    }
  };
}
