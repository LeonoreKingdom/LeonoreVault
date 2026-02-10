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

// ─── Inferred Types ─────────────────────────────────────────

export type GoogleCallbackSchema = z.infer<typeof googleCallbackSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
