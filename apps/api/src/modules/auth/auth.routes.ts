import { Router, type IRouter } from 'express';
import { googleCallbackSchema, refreshTokenSchema } from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as authController from './auth.controller.js';

export const authRouter: IRouter = Router();

// POST /api/auth/google/callback — Exchange Google OAuth code for session
authRouter.post(
  '/google/callback',
  validate(googleCallbackSchema, 'body'),
  authController.googleCallback,
);

// POST /api/auth/refresh — Refresh access token
authRouter.post(
  '/refresh',
  validate(refreshTokenSchema, 'body'),
  authController.refresh,
);

// GET /api/auth/me — Get current user profile + membership
authRouter.get(
  '/me',
  requireAuth,
  authController.me,
);
