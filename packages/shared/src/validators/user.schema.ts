import { z } from 'zod';

// ─── Base Schemas ───────────────────────────────────────────

/** Schema for a UUID string (used for all entity IDs) */
export const uuidSchema = z.string().uuid();

/** Schema for ISO 8601 datetime strings (from PostgreSQL timestamptz) */
export const timestampSchema = z.string().datetime({ offset: true });

// ─── User Schemas ───────────────────────────────────────────

/** Full user record as stored in the database */
export const userSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  display_name: z.string().min(1).max(100).nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/** User profile returned to the client (excludes sensitive fields) */
export const userProfileSchema = userSchema.omit({ updated_at: true });

/** Payload for updating own profile */
export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
});

// ─── Inferred Types ─────────────────────────────────────────

export type UserSchema = z.infer<typeof userSchema>;
export type UserProfileSchema = z.infer<typeof userProfileSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
