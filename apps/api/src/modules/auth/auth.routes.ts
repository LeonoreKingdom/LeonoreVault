import { Router, type IRouter } from 'express';
import {
  googleCallbackSchema,
  refreshTokenSchema,
  registerSchema,
  loginSchema,
} from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as authController from './auth.controller.js';

export const authRouter: IRouter = Router();

// POST /api/auth/register — Create an email/password account
authRouter.post('/register', validate(registerSchema, 'body'), authController.register);

// POST /api/auth/login — Sign in with email/password
authRouter.post('/login', validate(loginSchema, 'body'), authController.login);

// POST /api/auth/google/callback — Exchange Google OAuth code for session
authRouter.post(
  '/google/callback',
  validate(googleCallbackSchema, 'body'),
  authController.googleCallback,
);

// POST /api/auth/refresh — Refresh access token
authRouter.post('/refresh', validate(refreshTokenSchema, 'body'), authController.refresh);

// POST /api/auth/logout — Revoke the current session
authRouter.post('/logout', requireAuth, authController.logout);

// GET /api/auth/me — Get current user profile + membership
authRouter.get('/me', requireAuth, authController.me);
