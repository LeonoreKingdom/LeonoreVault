import { z } from 'zod';
import { uuidSchema } from './user.schema.js';

// ─── Location Schemas ───────────────────────────────────────

/** Full location record */
export const locationSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  name: z.string().min(1).max(100),
  parent_id: uuidSchema.nullable(),
  description: z.string().max(500).nullable(),
  sort_order: z.number().int().default(0),
});

/** Payload for creating a location */
export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100),
  parent_id: uuidSchema.nullable().optional(),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().default(0),
});

/** Payload for updating a location */
export const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parent_id: uuidSchema.nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
});

// ─── Inferred Types ─────────────────────────────────────────

export type LocationSchema = z.infer<typeof locationSchema>;
export type CreateLocationSchema = z.infer<typeof createLocationSchema>;
export type UpdateLocationSchema = z.infer<typeof updateLocationSchema>;
