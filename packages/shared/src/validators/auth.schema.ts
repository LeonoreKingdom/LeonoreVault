import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────

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

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
