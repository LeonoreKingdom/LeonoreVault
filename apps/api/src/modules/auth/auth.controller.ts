import type { Request, Response, NextFunction } from 'express';
import {
  handleGoogleCallback,
  handleRefreshToken,
  getCurrentUser,
  handleRegister,
  handleLogin,
  handleLogout,
} from './auth.service.js';
import type {
  GoogleCallbackSchema,
  RefreshTokenSchema,
  RegisterSchema,
  LoginSchema,
} from '@leonorevault/shared';

function bearerToken(req: Request): string {
  return req.headers.authorization!.slice(7);
}

/** POST /api/auth/register */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleRegister(req.body as RegisterSchema);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleLogin(req.body as LoginSchema);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleLogout(bearerToken(req));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/google/callback
 * Exchange Google OAuth code for a Supabase session.
 */
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
