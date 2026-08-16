import type {
  CreateItemSchema,
  ReturnItemSchema,
  UpdateItemSchema,
  UpdateItemStatusSchema,
  ItemListQuerySchema,
} from '@leonorevault/shared';
import {
  STATUS_TRANSITIONS,
  type ActivityAction,
  type ItemStatus,
  type Json,
} from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';
import {
  clearOverdueNotifications,
  createItemReturnedNotifications,
} from '../notification/notification.service.js';

// ─── Helpers ────────────────────────────────────────────────

function mapItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    householdId: row.household_id,
    qrToken: row.qr_token ?? null,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.category_id ?? null,
    locationId: row.location_id ?? null,
    storageSpotId: row.storage_spot_id ?? null,
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

function mapActivity(row: Record<string, unknown>) {
  const rawUser = row.user;
  const user =
    Array.isArray(rawUser) && rawUser.length > 0
      ? rawUser[0]
      : rawUser && typeof rawUser === 'object'
        ? rawUser
        : null;

  return {
    id: row.id,
    itemId: row.item_id,
    userId: row.user_id,
    action: row.action,
    details: row.details ?? null,
    createdAt: row.created_at,
    ...(rawUser !== undefined
      ? {
          user:
            user && typeof user === 'object'
              ? {
                  displayName: (user as Record<string, unknown>).display_name ?? null,
                  avatarUrl: (user as Record<string, unknown>).avatar_url ?? null,
                }
              : null,
        }
      : {}),
  };
}

async function recordItemActivity(
  itemId: string,
  userId: string,
  action: ActivityAction,
  details: Record<string, unknown> | null,
) {
  const { error } = await supabaseAdmin.from('item_activities').insert({
    item_id: itemId,
    user_id: userId,
    action,
    details: details as Json,
  });

  if (error) {
    logger.error({ error: error.message, itemId, action }, 'Failed to record item activity');
  }
}

async function assertBorrowerInHousehold(borrowerId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('memberships')
    .select('user_id')
    .eq('household_id', householdId)
    .eq('user_id', borrowerId)
    .maybeSingle();

  if (error) {
    logger.error({ error: error.message, borrowerId, householdId }, 'Failed to validate borrower');
    throw new AppError(500, 'Failed to validate borrower', 'INTERNAL_ERROR');
  }
  if (!data)
    throw new AppError(400, 'Borrower is not a member of this household', 'INVALID_BORROWER');
}

async function createBorrowRecord(
  itemId: string,
  householdId: string,
  borrowedBy: string,
  dueAt: string | null,
  note: string | null,
) {
  const { data, error } = await supabaseAdmin
    .from('borrow_records')
    .insert({
      item_id: itemId,
      household_id: householdId,
      borrowed_by: borrowedBy,
      due_at: dueAt,
      note,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(409, 'Item already has an active checkout', 'ALREADY_CHECKED_OUT');
    }
    logger.error({ error: error.message, itemId }, 'Failed to create borrow record');
    throw new AppError(500, 'Failed to create borrow record', 'INTERNAL_ERROR');
  }
  return data;
}

async function deleteBorrowRecord(recordId: string) {
  const { error } = await supabaseAdmin.from('borrow_records').delete().eq('id', recordId);
  if (error) logger.error({ error: error.message, recordId }, 'Failed to roll back borrow record');
}

async function closeActiveBorrowRecord(itemId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('borrow_records')
    .update({ returned_at: new Date().toISOString() })
    .eq('item_id', itemId)
    .eq('household_id', householdId)
    .is('returned_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    logger.error({ error: error.message, itemId }, 'Failed to close borrow record');
    throw new AppError(500, 'Failed to close borrow record', 'INTERNAL_ERROR');
  }
  return data?.id as string | undefined;
}

async function reopenBorrowRecord(recordId: string) {
  const { error } = await supabaseAdmin
    .from('borrow_records')
    .update({ returned_at: null })
    .eq('id', recordId);
  if (error) logger.error({ error: error.message, recordId }, 'Failed to roll back return');
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
 * Return the inventory counts and the latest returns for the overview page.
 * Recent returns intentionally use a short, fixed window so the summary stays
 * useful without exposing an unbounded activity feed.
 */
export async function getItemSummary(householdId: string) {
  const recentReturnSince = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [{ data: items, error: itemsError }, { data: returns, error: returnsError }] =
    await Promise.all([
      supabaseAdmin
        .from('items')
        .select('status')
        .eq('household_id', householdId)
        .is('deleted_at', null),
      supabaseAdmin
        .from('borrow_records')
        .select('id, item_id, returned_at')
        .eq('household_id', householdId)
        .not('returned_at', 'is', null)
        .gte('returned_at', recentReturnSince)
        .order('returned_at', { ascending: false })
        .limit(5),
    ]);

  if (itemsError) {
    logger.error({ error: itemsError.message, householdId }, 'Failed to fetch item summary');
    throw new AppError(500, 'Failed to fetch item summary', 'INTERNAL_ERROR');
  }

  if (returnsError) {
    logger.error({ error: returnsError.message, householdId }, 'Failed to fetch recent returns');
    throw new AppError(500, 'Failed to fetch recent returns', 'INTERNAL_ERROR');
  }

  const itemRows = items ?? [];
  const recentReturns = (returns ?? []).map((record) => ({
    id: record.id,
    itemId: record.item_id,
    returnedAt: record.returned_at,
  }));

  return {
    summary: {
      totalItems: itemRows.length,
      storedItems: itemRows.filter((item) => item.status === 'stored').length,
      checkedOutItems: itemRows.filter((item) => item.status === 'borrowed').length,
      recentlyReturned: recentReturns.length,
    },
    recentReturns,
  };
}

/**
 * Get a single item by ID, including its attachments and recent activity.
 */
export async function getItem(itemId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .single();

  if (error) {
    logger.error({ error: error.message, itemId, householdId }, 'Failed to fetch item');
    throw new AppError(500, 'Failed to fetch item', 'INTERNAL_ERROR');
  }
  if (!data) {
    throw new AppError(404, 'Item not found', 'NOT_FOUND');
  }

  // Fetch attachments for this item
  const { data: attachments, error: attachmentsError } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (attachmentsError) {
    logger.error(
      { error: attachmentsError.message, itemId, householdId },
      'Failed to fetch item attachments',
    );
    throw new AppError(500, 'Failed to fetch item attachments', 'INTERNAL_ERROR');
  }

  const { data: recentActivity, error: activityError } = await supabaseAdmin
    .from('item_activities')
    .select(
      'id, item_id, user_id, action, details, created_at, user:users(display_name, avatar_url)',
    )
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (activityError) {
    logger.error(
      { error: activityError.message, itemId, householdId },
      'Failed to fetch item activity history',
    );
    throw new AppError(500, 'Failed to fetch item activity history', 'INTERNAL_ERROR');
  }

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
    recentActivity: (recentActivity || []).map((activity) =>
      mapActivity(activity as unknown as Record<string, unknown>),
    ),
  };
}

/**
 * Get the immutable activity history for an item.
 */
export async function getItemActivities(itemId: string, householdId: string) {
  const { data: item, error: itemError } = await supabaseAdmin
    .from('items')
    .select('id')
    .eq('id', itemId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (itemError) {
    logger.error({ error: itemError.message, itemId }, 'Failed to validate item for activities');
    throw new AppError(500, 'Failed to validate item', 'INTERNAL_ERROR');
  }
  if (!item) throw new AppError(404, 'Item not found', 'NOT_FOUND');

  const { data, error } = await supabaseAdmin
    .from('item_activities')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error({ error: error.message, itemId }, 'Failed to fetch item activities');
    throw new AppError(500, 'Failed to fetch item activities', 'INTERNAL_ERROR');
  }

  return { activities: (data || []).map((row) => mapActivity(row as Record<string, unknown>)) };
}

/**
 * Create a new item.
 */
export async function createItem(householdId: string, userId: string, payload: CreateItemSchema) {
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

  await recordItemActivity((data as Record<string, unknown>).id as string, userId, 'created', {
    name: payload.name,
  });

  return { item: mapItem(data) };
}

/** Return a checked-out item and close its active borrow record. */
export async function returnItem(
  itemId: string,
  householdId: string,
  userId: string,
  payload: ReturnItemSchema,
) {
  return updateItemStatus(itemId, householdId, userId, {
    status: 'stored',
    note: payload.note,
  });
}

/**
 * Update an existing item.
 */
export async function updateItem(
  itemId: string,
  householdId: string,
  userId: string,
  payload: UpdateItemSchema,
) {
  if (
    payload.status !== undefined ||
    payload.borrowed_by !== undefined ||
    payload.borrow_due_date !== undefined
  ) {
    throw new AppError(
      400,
      'Use the status endpoint for checkout and return operations',
      'STATUS_ENDPOINT_REQUIRED',
    );
  }

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

  await recordItemActivity(itemId, userId, 'updated', { fields: Object.keys(updateData) });

  return { item: mapItem(data) };
}

/**
 * Update item status with state machine validation.
 */
export async function updateItemStatus(
  itemId: string,
  householdId: string,
  userId: string,
  payload: UpdateItemStatusSchema,
) {
  // Get current status
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('items')
    .select('status, name, borrowed_by')
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

  if (currentStatus === 'borrowed' && newStatus === 'borrowed') {
    throw new AppError(409, 'Item already has an active checkout', 'ALREADY_CHECKED_OUT');
  }

  // Validate transition
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      400,
      `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${(allowed || []).join(', ')}`,
      'INVALID_TRANSITION',
    );
  }

  if (newStatus === 'borrowed' && !payload.borrowed_by) {
    throw new AppError(
      400,
      'A borrower is required when checking out an item',
      'BORROWER_REQUIRED',
    );
  }

  let borrowRecordId: string | undefined;
  let closedBorrowRecordId: string | undefined;

  if (newStatus === 'borrowed') {
    await assertBorrowerInHousehold(payload.borrowed_by!, householdId);
    const borrowRecord = await createBorrowRecord(
      itemId,
      householdId,
      payload.borrowed_by!,
      payload.borrow_due_date ?? null,
      payload.note ?? null,
    );
    borrowRecordId = (borrowRecord as Record<string, unknown>).id as string;
  } else if (currentStatus === 'borrowed') {
    closedBorrowRecordId = await closeActiveBorrowRecord(itemId, householdId);
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

  logger.debug(
    { itemId, householdId, currentStatus, newStatus, updateData },
    'Updating item status',
  );

  const { data, error } = await supabaseAdmin
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) {
    logger.error(
      { error: error.message, code: error.code, details: error.details, hint: error.hint },
      'Failed to update item status',
    );
    if (borrowRecordId) await deleteBorrowRecord(borrowRecordId);
    if (closedBorrowRecordId) await reopenBorrowRecord(closedBorrowRecordId);
    if (error.code === 'PGRST116') {
      throw new AppError(404, 'Item not found', 'NOT_FOUND');
    }
    throw new AppError(500, 'Failed to update item status', 'INTERNAL_ERROR');
  }

  await recordItemActivity(itemId, userId, 'status_changed', {
    oldStatus: currentStatus,
    newStatus,
    borrowedBy: payload.borrowed_by ?? null,
    borrowRecordId: borrowRecordId ?? closedBorrowRecordId ?? null,
  });

  if (currentStatus === 'borrowed' && newStatus === 'stored') {
    if (closedBorrowRecordId) {
      await clearOverdueNotifications(itemId, closedBorrowRecordId);
    }

    await createItemReturnedNotifications({
      householdId,
      itemId,
      itemName: String((current as Record<string, unknown>).name ?? 'Item'),
      actorUserId: userId,
      borrowedBy: ((current as Record<string, unknown>).borrowed_by as string | null) ?? null,
      note: payload.note ?? null,
    });
  }

  return { item: mapItem(data) };
}

/**
 * Soft-delete an item (sets deleted_at).
 */
export async function softDeleteItem(itemId: string, householdId: string, userId: string) {
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

  await recordItemActivity(itemId, userId, 'updated', { deleted: true });

  return { deleted: true, id: itemId };
}

/**
 * Restore a soft-deleted item.
 */
export async function restoreItem(itemId: string, householdId: string, userId: string) {
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

  await recordItemActivity(itemId, userId, 'updated', { restored: true });

  return { item: mapItem(data) };
}
