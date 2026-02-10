import { z } from 'zod';
import { ITEM_STATUSES } from '../constants/item-status.js';
import { MAX_TAGS_PER_ITEM, MAX_TAG_LENGTH } from '../constants/defaults.js';
import { uuidSchema, timestampSchema } from './user.schema.js';

// ─── Tag Validation ─────────────────────────────────────────

/** Reusable tag array schema enforcing per-tag and total limits */
const tagsSchema = z
  .array(z.string().min(1).max(MAX_TAG_LENGTH))
  .max(MAX_TAGS_PER_ITEM)
  .default([]);

// ─── Item Schemas ───────────────────────────────────────────

/** Full item record as stored in the database */
export const itemSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  category_id: uuidSchema.nullable(),
  location_id: uuidSchema.nullable(),
  quantity: z.number().int().min(1),
  tags: tagsSchema,
  status: z.enum(ITEM_STATUSES),
  created_by: uuidSchema,
  borrowed_by: uuidSchema.nullable(),
  borrow_due_date: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.nullable(),
});

/** Payload for creating a new item */
export const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(2000).optional(),
  category_id: uuidSchema.optional(),
  location_id: uuidSchema.optional(),
  quantity: z.number().int().min(1).default(1),
  tags: tagsSchema.optional(),
  status: z.enum(ITEM_STATUSES).default('stored'),
});

/** Payload for updating an existing item (all fields optional) */
export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  category_id: uuidSchema.nullable().optional(),
  location_id: uuidSchema.nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  tags: tagsSchema.optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  borrowed_by: uuidSchema.nullable().optional(),
  borrow_due_date: timestampSchema.nullable().optional(),
});

/**
 * Schema for status transition requests.
 * The state machine validation (is the transition valid?)
 * is handled in the service layer using STATUS_TRANSITIONS.
 */
export const updateItemStatusSchema = z.object({
  status: z.enum(ITEM_STATUSES),
  borrowed_by: uuidSchema.nullable().optional(),
  borrow_due_date: timestampSchema.nullable().optional(),
});

/** Query parameters for listing items */
export const itemListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'created_at', 'updated_at', 'status']).default('updated_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  category_id: uuidSchema.optional(),
  location_id: uuidSchema.optional(),
  tags: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim()))
    .optional(),
});

// ─── Inferred Types ─────────────────────────────────────────

export type ItemSchema = z.infer<typeof itemSchema>;
export type CreateItemSchema = z.infer<typeof createItemSchema>;
export type UpdateItemSchema = z.infer<typeof updateItemSchema>;
export type UpdateItemStatusSchema = z.infer<typeof updateItemStatusSchema>;
export type ItemListQuerySchema = z.infer<typeof itemListQuerySchema>;
