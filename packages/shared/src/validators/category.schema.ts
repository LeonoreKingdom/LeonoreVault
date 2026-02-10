import { z } from 'zod';
import { uuidSchema } from './user.schema.js';

// ─── Category Schemas ───────────────────────────────────────

/** Full category record */
export const categorySchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  name: z.string().min(1).max(100),
  parent_id: uuidSchema.nullable(),
  icon: z.string().max(50).nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .nullable(),
  sort_order: z.number().int().default(0),
});

/** Payload for creating a category */
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  parent_id: uuidSchema.nullable().optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  sort_order: z.number().int().default(0),
});

/** Payload for updating a category */
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parent_id: uuidSchema.nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .nullable()
    .optional(),
  sort_order: z.number().int().optional(),
});

// ─── Inferred Types ─────────────────────────────────────────

export type CategorySchema = z.infer<typeof categorySchema>;
export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;
