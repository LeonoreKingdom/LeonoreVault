import express, { Router, type IRouter } from 'express';
import {
  registerSchema,
  loginSchema,
} from '@leonorevault/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as authController from './auth.controller.js';

export const authRouter: IRouter = Router();
const parseJsonBody = express.json();

// POST /api/auth/register — Create an email/password account
authRouter.post('/register', parseJsonBody, validate(registerSchema, 'body'), authController.register);

// POST /api/auth/login — Sign in with email/password
authRouter.post('/login', parseJsonBody, validate(loginSchema, 'body'), authController.login);

// POST /api/auth/logout — Revoke the current session
authRouter.post('/logout', requireAuth, authController.logout);

// GET /api/auth/me — Get current user profile + membership
authRouter.get('/me', requireAuth, authController.me);
