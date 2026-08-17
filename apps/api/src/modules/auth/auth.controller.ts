import type { Request, Response, NextFunction } from 'express';
import {
  getCurrentUser,
  handleRegister,
  handleLogin,
  handleLogout,
} from './auth.service.js';
import type {
  RegisterSchema,
  LoginSchema,
} from '@leonorevault/shared';

function requestHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

/** POST /api/auth/register */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleRegister(req.body as RegisterSchema, requestHeaders(req));
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleLogin(req.body as LoginSchema, requestHeaders(req));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await handleLogout(requestHeaders(req));
    res.status(200).json({ success: true, data: result });
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
