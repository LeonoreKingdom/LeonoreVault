import type { ItemStatus } from '../constants/item-status.js';

/**
 * Item entity — the core inventory record.
 * Soft-deletable via `deleted_at`.
 */
export interface Item {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  location_id: string | null;
  quantity: number;
  tags: string[];
  status: ItemStatus;
  created_by: string;
  borrowed_by: string | null;
  borrow_due_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Minimal item shape used in list views */
export interface ItemSummary {
  id: string;
  name: string;
  status: ItemStatus;
  quantity: number;
  category_name: string | null;
  location_name: string | null;
  tags: string[];
  updated_at: string;
}

/** Payload for creating a new item */
export interface CreateItemPayload {
  name: string;
  description?: string;
  category_id?: string;
  location_id?: string;
  quantity?: number;
  tags?: string[];
  status?: ItemStatus;
}

/** Payload for updating an existing item */
export interface UpdateItemPayload extends Partial<CreateItemPayload> {
  borrowed_by?: string | null;
  borrow_due_date?: string | null;
}
