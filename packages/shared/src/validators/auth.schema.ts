import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────

/** Google OAuth callback payload (code from PKCE flow) */
export const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  code_verifier: z.string().min(1, 'Code verifier is required'),
});

/** Token refresh request */
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// ─── Inferred Types ─────────────────────────────────────────

export type GoogleCallbackSchema = z.infer<typeof googleCallbackSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
