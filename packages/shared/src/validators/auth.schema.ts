import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────

/** Google OAuth callback payload */
export const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Must be a valid redirect URI'),
});

/** Token refresh request */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/** Password rules shared by registration and password login. */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/** Email/password registration payload. */
export const registerSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
});

/** Email/password login payload. */
export const loginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Inferred Types ─────────────────────────────────────────

export type GoogleCallbackSchema = z.infer<typeof googleCallbackSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
