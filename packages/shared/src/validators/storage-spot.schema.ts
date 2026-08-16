import { z } from 'zod';
import { uuidSchema } from './user.schema.js';

export const storageSpotTypeSchema = z.enum(['room', 'cabinet', 'shelf', 'drawer', 'box', 'other']);

/** Payload for creating a storage spot. */
export const createStorageSpotSchema = z.object({
  name: z.string().min(1, 'Storage spot name is required').max(100),
  parent_id: uuidSchema.nullable().optional(),
  spot_type: storageSpotTypeSchema.default('other'),
  description: z.string().max(500).nullable().optional(),
  capacity: z.number().int().min(0).max(1_000_000).default(0),
  sort_order: z.number().int().min(0).max(1_000_000).default(0),
});

/** Payload for updating a storage spot. */
export const updateStorageSpotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parent_id: uuidSchema.nullable().optional(),
  spot_type: storageSpotTypeSchema.optional(),
  description: z.string().max(500).nullable().optional(),
  capacity: z.number().int().min(0).max(1_000_000).optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
});

export type CreateStorageSpotSchema = z.infer<typeof createStorageSpotSchema>;
export type UpdateStorageSpotSchema = z.infer<typeof updateStorageSpotSchema>;
