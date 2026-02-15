import type {
  CreateItemSchema,
  UpdateItemSchema,
  UpdateItemStatusSchema,
  ItemListQuerySchema,
} from '@leonorevault/shared';
import { STATUS_TRANSITIONS, type ItemStatus } from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

// ─── Helpers ────────────────────────────────────────────────

function mapItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.category_id ?? null,
    locationId: row.location_id ?? null,
    quantity: row.quantity,
    tags: row.tags ?? [],
    status: row.status,
    createdBy: row.created_by,
    borrowedBy: row.borrowed_by ?? null,
    borrowDueDate: row.borrow_due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

// ─── Service Functions ──────────────────────────────────────

/**
 * List items with search, filter, sort, and pagination.
 */
export async function listItems(householdId: string, query: ItemListQuerySchema) {
  const { page, limit, sort, order, search, status, category_id, location_id, tags } = query;
  const offset = (page - 1) * limit;

  let q = supabaseAdmin
    .from('items')
    .select('*', { count: 'exact' })
    .eq('household_id', householdId)
    .is('deleted_at', null);

  // Filters
  if (status) q = q.eq('status', status);
  if (category_id) q = q.eq('category_id', category_id);
  if (location_id) q = q.eq('location_id', location_id);
  if (tags && tags.length > 0) q = q.contains('tags', tags);
  if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

  // Sort + pagination
  q = q.order(sort, { ascending: order === 'asc' }).range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    logger.error({ error: error.message }, 'Failed to list items');
    throw new AppError(500, 'Failed to fetch items', 'INTERNAL_ERROR');
  }

  return {
    items: (data || []).map(mapItem),
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

/**
 * Get a single item by ID, including its attachments.
 */
export async function getItem(itemId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Item not found', 'NOT_FOUND');
  }

  // Fetch attachments for this item
  const { data: attachments } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  return {
    item: mapItem(data),
    attachments: (attachments || []).map((a: Record<string, unknown>) => ({
      id: a.id,
      itemId: a.item_id,
      driveFileId: a.drive_file_id,
      fileName: a.file_name,
      mimeType: a.mime_type,
      thumbnailUrl: a.thumbnail_url ?? null,
      webViewLink: a.web_view_link ?? null,
      createdBy: a.created_by,
      createdAt: a.created_at,
    })),
  };
}

/**
 * Create a new item.
 */
export async function createItem(
  householdId: string,
  userId: string,
  payload: CreateItemSchema,
) {
  const { data, error } = await supabaseAdmin
    .from('items')
    .insert({
      household_id: householdId,
      created_by: userId,
      name: payload.name,
      description: payload.description ?? null,
      category_id: payload.category_id ?? null,
      location_id: payload.location_id ?? null,
      quantity: payload.quantity ?? 1,
      tags: payload.tags ?? [],
      status: payload.status ?? 'stored',
    })
    .select()
    .single();

  if (error) {
    logger.error({ error: error.message }, 'Failed to create item');
    throw new AppError(500, 'Failed to create item', 'INTERNAL_ERROR');
  }

  return { item: mapItem(data) };
}

/**
 * Update an existing item.
 */
export async function updateItem(
  itemId: string,
  householdId: string,
  payload: UpdateItemSchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.category_id !== undefined) updateData.category_id = payload.category_id;
  if (payload.location_id !== undefined) updateData.location_id = payload.location_id;
  if (payload.quantity !== undefined) updateData.quantity = payload.quantity;
  if (payload.tags !== undefined) updateData.tags = payload.tags;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.borrowed_by !== undefined) updateData.borrowed_by = payload.borrowed_by;
  if (payload.borrow_due_date !== undefined) updateData.borrow_due_date = payload.borrow_due_date;

  const { data, error } = await supabaseAdmin
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AppError(404, 'Item not found', 'NOT_FOUND');
    }
    logger.error({ error: error.message }, 'Failed to update item');
    throw new AppError(500, 'Failed to update item', 'INTERNAL_ERROR');
  }

  return { item: mapItem(data) };
}

/**
 * Update item status with state machine validation.
 */
export async function updateItemStatus(
  itemId: string,
  householdId: string,
  payload: UpdateItemStatusSchema,
) {
  // Get current status
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('items')
    .select('status')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    logger.error({ fetchError, itemId, householdId }, 'Item not found for status update');
    throw new AppError(404, 'Item not found', 'NOT_FOUND');
  }

  const currentStatus = current.status as ItemStatus;
  const newStatus = payload.status as ItemStatus;

  // Validate transition
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      400,
      `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${(allowed || []).join(', ')}`,
      'INVALID_TRANSITION',
    );
  }

  // Build update
  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'borrowed') {
    updateData.borrowed_by = payload.borrowed_by ?? null;
    updateData.borrow_due_date = payload.borrow_due_date ?? null;
  } else {
    // Clear borrow fields when not borrowed
    updateData.borrowed_by = null;
    updateData.borrow_due_date = null;
  }

  logger.debug({ itemId, householdId, currentStatus, newStatus, updateData }, 'Updating item status');

  const { data, error } = await supabaseAdmin
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) {
    logger.error({ error: error.message, code: error.code, details: error.details, hint: error.hint }, 'Failed to update item status');
    throw new AppError(500, 'Failed to update item status', 'INTERNAL_ERROR');
  }

  return { item: mapItem(data) };
}

/**
 * Soft-delete an item (sets deleted_at).
 */
export async function softDeleteItem(itemId: string, householdId: string) {
  const { error } = await supabaseAdmin
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('household_id', householdId)
    .is('deleted_at', null);

  if (error) {
    logger.error({ error: error.message }, 'Failed to soft-delete item');
    throw new AppError(500, 'Failed to delete item', 'INTERNAL_ERROR');
  }

  return { deleted: true, id: itemId };
}

/**
 * Restore a soft-deleted item.
 */
export async function restoreItem(itemId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('items')
    .update({ deleted_at: null })
    .eq('id', itemId)
    .eq('household_id', householdId)
    .not('deleted_at', 'is', null)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(404, 'Deleted item not found', 'NOT_FOUND');
  }

  return { item: mapItem(data) };
}
