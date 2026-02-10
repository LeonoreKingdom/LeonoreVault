import { z } from 'zod';
import { MEMBERSHIP_ROLES } from '../constants/roles.js';
import { INVITE_CODE_LENGTH } from '../constants/defaults.js';
import { uuidSchema, timestampSchema } from './user.schema.js';

// ─── Household Schemas ──────────────────────────────────────

/** Full household record */
export const householdSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  created_by: uuidSchema,
  invite_code: z
    .string()
    .length(INVITE_CODE_LENGTH)
    .regex(/^[A-Z0-9]+$/, 'Must be uppercase alphanumeric')
    .nullable(),
  invite_expires_at: timestampSchema.nullable(),
  drive_folder_id: z.string().nullable(),
  created_at: timestampSchema,
});

/** Payload for creating a new household */
export const createHouseholdSchema = z.object({
  name: z.string().min(1, 'Household name is required').max(100),
});

/** Payload for updating a household */
export const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// ─── Membership Schemas ─────────────────────────────────────

/** Full membership record */
export const membershipSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  household_id: uuidSchema,
  role: z.enum(MEMBERSHIP_ROLES),
  joined_at: timestampSchema,
});

/** Payload for joining via invite code */
export const joinHouseholdSchema = z.object({
  invite_code: z
    .string()
    .length(INVITE_CODE_LENGTH)
    .regex(/^[A-Z0-9]+$/, 'Invalid invite code format'),
});

/** Payload for updating a member's role */
export const updateMemberRoleSchema = z.object({
  role: z.enum(MEMBERSHIP_ROLES),
});

// ─── Inferred Types ─────────────────────────────────────────

export type HouseholdSchema = z.infer<typeof householdSchema>;
export type CreateHouseholdSchema = z.infer<typeof createHouseholdSchema>;
export type UpdateHouseholdSchema = z.infer<typeof updateHouseholdSchema>;
export type MembershipSchema = z.infer<typeof membershipSchema>;
export type JoinHouseholdSchema = z.infer<typeof joinHouseholdSchema>;
export type UpdateMemberRoleSchema = z.infer<typeof updateMemberRoleSchema>;
