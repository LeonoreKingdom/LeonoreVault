import type { Request, Response, NextFunction } from 'express';
import { handleGoogleCallback, handleRefreshToken, getCurrentUser } from './auth.service.js';
import type { GoogleCallbackSchema, RefreshTokenSchema } from '@leonorevault/shared';

/**
 * POST /api/auth/google/callback
 * Exchange Google OAuth code for a Supabase session.
 */
export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleGoogleCallback(req.body as GoogleCallbackSchema);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh an expired access token.
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleRefreshToken(req.body as RefreshTokenSchema);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user's profile and membership.
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
