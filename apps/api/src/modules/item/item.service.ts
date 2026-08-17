import type {
  CreateItemSchema,
  ItemListQuerySchema,
  ReturnItemSchema,
  UpdateItemSchema,
  UpdateItemStatusSchema,
} from '@leonorevault/shared';
import {
  STATUS_TRANSITIONS,
  type ActivityAction,
  type ItemStatus,
} from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';
import {
  clearOverdueNotifications,
  createItemReturnedNotifications,
} from '../notification/notification.service.js';

function mapItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    householdId: row.householdId,
    qrToken: row.qrToken ?? null,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.categoryId ?? null,
    locationId: row.locationId ?? null,
    storageSpotId: row.storageSpotId ?? null,
    quantity: row.quantity,
    tags: row.tags ?? [],
    status: row.status,
    createdBy: row.createdBy,
    borrowedBy: row.borrowedBy ?? null,
    borrowDueDate: row.borrowDueDate ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

function mapAttachment(row: Record<string, unknown>) {
  return {
    id: row.id,
    itemId: row.itemId,
    objectKey: row.objectKey,
    bucket: row.bucket,
    fileName: row.fileName,
    mimeType: row.mimeType,
    thumbnailKey: row.thumbnailKey ?? null,
    thumbnailUrl: null,
    webViewLink: null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function mapActivity(row: Record<string, unknown>) {
  const user = row.user as Record<string, unknown> | undefined;
  return {
    id: row.id,
    itemId: row.itemId,
    userId: row.userId,
    action: row.action,
    details: row.details ?? null,
    createdAt: row.createdAt,
    ...(user
      ? { user: { displayName: user.displayName ?? null, avatarUrl: user.avatarUrl ?? null } }
      : {}),
  };
}

async function recordItemActivity(
  itemId: string,
  userId: string,
  action: ActivityAction,
  details: Record<string, unknown> | null,
) {
  try {
    const repositories = await getInventoryRepositories();
    await repositories.activities.create({ itemId, userId, action, details });
  } catch (err) {
    logger.error({ err, itemId, action }, 'Failed to record item activity');
  }
}

async function assertBorrowerInHousehold(borrowerId: string, householdId: string) {
  const repositories = await getInventoryRepositories();
  if (!(await repositories.memberships.findByUserAndHousehold(borrowerId, householdId))) {
    throw new AppError(400, 'Borrower is not a member of this household', 'INVALID_BORROWER');
  }
}

async function createBorrowRecord(
  itemId: string,
  householdId: string,
  borrowedBy: string,
  dueAt: string | null,
  note: string | null,
) {
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.borrowRecords.create({
      itemId,
      householdId,
      borrowedBy,
      dueAt: dueAt ? new Date(dueAt) : null,
      note,
    });
    if (!row) throw new Error('Borrow record insert returned no row');
    return row;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE') || message.includes('unique')) {
      throw new AppError(409, 'Item already has an active checkout', 'ALREADY_CHECKED_OUT');
    }
    logger.error({ err, itemId }, 'Failed to create borrow record');
    throw new AppError(500, 'Failed to create borrow record', 'INTERNAL_ERROR');
  }
}

async function deleteBorrowRecord(recordId: string) {
  try {
    const repositories = await getInventoryRepositories();
    await repositories.borrowRecords.removeById(recordId);
  } catch (err) {
    logger.error({ err, recordId }, 'Failed to roll back borrow record');
  }
}

async function closeActiveBorrowRecord(itemId: string, householdId: string) {
  const repositories = await getInventoryRepositories();
  const row = await repositories.borrowRecords.closeActive(itemId, householdId);
  return row?.id;
}

async function reopenBorrowRecord(recordId: string) {
  try {
    const repositories = await getInventoryRepositories();
    await repositories.borrowRecords.reopen(recordId);
  } catch (err) {
    logger.error({ err, recordId }, 'Failed to roll back return');
  }
}

export async function listItems(householdId: string, query: ItemListQuerySchema) {
  const repositories = await getInventoryRepositories();
  const sort =
    query.sort === 'created_at' ? 'createdAt' : query.sort === 'updated_at' ? 'updatedAt' : 'name';
  const result = await repositories.items.listByHousehold(householdId, {
    search: query.search,
    status: query.status,
    categoryId: query.category_id,
    locationId: query.location_id,
    tags: query.tags,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    sort,
    order: query.order,
  });
  return {
    items: result.items.map((row) => mapItem(row as unknown as Record<string, unknown>)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getItemSummary(householdId: string) {
  const repositories = await getInventoryRepositories();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [counts, returns] = await Promise.all([
    repositories.items.countByStatus(householdId),
    repositories.borrowRecords.listReturnedSince(householdId, since),
  ]);
  const countByStatus = new Map(counts.map((row) => [row.status, Number(row.count)]));
  return {
    summary: {
      totalItems: [...countByStatus.values()].reduce((total, value) => total + value, 0),
      storedItems: countByStatus.get('stored') ?? 0,
      checkedOutItems: countByStatus.get('borrowed') ?? 0,
      recentlyReturned: returns.length,
    },
    recentReturns: returns.map((record) => ({
      id: record.id,
      itemId: record.itemId,
      returnedAt: record.returnedAt,
    })),
  };
}

export async function getItem(itemId: string, householdId: string) {
  const repositories = await getInventoryRepositories();
  const item = await repositories.items.findById(itemId, householdId);
  if (!item || item.deletedAt) throw new AppError(404, 'Item not found', 'NOT_FOUND');
  const [attachments, activityRows] = await Promise.all([
    repositories.attachments.listByItem(itemId),
    repositories.activities.listByItemWithUsers(itemId, 20),
  ]);
  return {
    item: mapItem(item as unknown as Record<string, unknown>),
    attachments: attachments.map((row) => mapAttachment(row as unknown as Record<string, unknown>)),
    recentActivity: activityRows.map(({ activity, user }) =>
      mapActivity({
        ...(activity as unknown as Record<string, unknown>),
        user: user as unknown as Record<string, unknown>,
      }),
    ),
  };
}

export async function getItemActivities(itemId: string, householdId: string) {
  const repositories = await getInventoryRepositories();
  const item = await repositories.items.findById(itemId, householdId);
  if (!item) throw new AppError(404, 'Item not found', 'NOT_FOUND');
  const rows = await repositories.activities.listByItem(itemId, 100);
  return { activities: rows.map((row) => mapActivity(row as unknown as Record<string, unknown>)) };
}

export async function createItem(householdId: string, userId: string, payload: CreateItemSchema) {
  const repositories = await getInventoryRepositories();
  const row = await repositories.items.create({
    householdId,
    createdBy: userId,
    name: payload.name,
    description: payload.description ?? null,
    categoryId: payload.category_id ?? null,
    locationId: payload.location_id ?? null,
    quantity: payload.quantity ?? 1,
    tags: payload.tags ?? [],
    status: payload.status ?? 'stored',
  });
  if (!row) throw new AppError(500, 'Failed to create item', 'INTERNAL_ERROR');
  await recordItemActivity(row.id, userId, 'created', { name: payload.name });
  return { item: mapItem(row as unknown as Record<string, unknown>) };
}

export async function returnItem(
  itemId: string,
  householdId: string,
  userId: string,
  payload: ReturnItemSchema,
) {
  return updateItemStatus(itemId, householdId, userId, { status: 'stored', note: payload.note });
}

export async function updateItem(
  itemId: string,
  householdId: string,
  userId: string,
  payload: UpdateItemSchema,
) {
  if (payload.status !== undefined || payload.borrowed_by !== undefined || payload.borrow_due_date !== undefined) {
    throw new AppError(400, 'Use the status endpoint for checkout and return operations', 'STATUS_ENDPOINT_REQUIRED');
  }
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.category_id !== undefined) updateData.categoryId = payload.category_id;
  if (payload.location_id !== undefined) updateData.locationId = payload.location_id;
  if (payload.quantity !== undefined) updateData.quantity = payload.quantity;
  if (payload.tags !== undefined) updateData.tags = payload.tags;
  if (Object.keys(updateData).length === 0) throw new AppError(400, 'At least one item field is required', 'EMPTY_UPDATE');
  const repositories = await getInventoryRepositories();
  const row = await repositories.items.update(itemId, householdId, updateData as never);
  if (!row) throw new AppError(404, 'Item not found', 'NOT_FOUND');
  await recordItemActivity(itemId, userId, 'updated', { fields: Object.keys(updateData) });
  return { item: mapItem(row as unknown as Record<string, unknown>) };
}

export async function updateItemStatus(
  itemId: string,
  householdId: string,
  userId: string,
  payload: UpdateItemStatusSchema,
) {
  const repositories = await getInventoryRepositories();
  const current = await repositories.items.findById(itemId, householdId);
  if (!current || current.deletedAt) throw new AppError(404, 'Item not found', 'NOT_FOUND');
  const currentStatus = current.status as ItemStatus;
  const newStatus = payload.status as ItemStatus;
  if (currentStatus === 'borrowed' && newStatus === 'borrowed') {
    throw new AppError(409, 'Item already has an active checkout', 'ALREADY_CHECKED_OUT');
  }
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed?.includes(newStatus)) {
    throw new AppError(400, `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${(allowed ?? []).join(', ')}`, 'INVALID_TRANSITION');
  }
  if (newStatus === 'borrowed' && !payload.borrowed_by) {
    throw new AppError(400, 'A borrower is required when checking out an item', 'BORROWER_REQUIRED');
  }
  let borrowRecordId: string | undefined;
  let closedBorrowRecordId: string | undefined;
  if (newStatus === 'borrowed') {
    await assertBorrowerInHousehold(payload.borrowed_by!, householdId);
    const record = await createBorrowRecord(itemId, householdId, payload.borrowed_by!, payload.borrow_due_date ?? null, payload.note ?? null);
    borrowRecordId = record.id;
  } else if (currentStatus === 'borrowed') {
    closedBorrowRecordId = await closeActiveBorrowRecord(itemId, householdId);
  }
  const updateData: Record<string, unknown> = {
    status: newStatus,
    borrowedBy: newStatus === 'borrowed' ? payload.borrowed_by ?? null : null,
    borrowDueDate: newStatus === 'borrowed' && payload.borrow_due_date ? new Date(payload.borrow_due_date) : null,
  };
  let row;
  try {
    row = await repositories.items.update(itemId, householdId, updateData as never);
    if (!row) throw new AppError(404, 'Item not found', 'NOT_FOUND');
  } catch (err) {
    if (borrowRecordId) await deleteBorrowRecord(borrowRecordId);
    if (closedBorrowRecordId) await reopenBorrowRecord(closedBorrowRecordId);
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'Failed to update item status', 'INTERNAL_ERROR');
  }
  await recordItemActivity(itemId, userId, 'status_changed', {
    oldStatus: currentStatus,
    newStatus,
    borrowedBy: payload.borrowed_by ?? null,
    borrowRecordId: borrowRecordId ?? closedBorrowRecordId ?? null,
  });
  if (currentStatus === 'borrowed' && newStatus === 'stored') {
    if (closedBorrowRecordId) await clearOverdueNotifications(itemId, closedBorrowRecordId);
    await createItemReturnedNotifications({
      householdId,
      itemId,
      itemName: String(current.name),
      actorUserId: userId,
      borrowedBy: current.borrowedBy,
      note: payload.note ?? null,
    });
  }
  return { item: mapItem(row as unknown as Record<string, unknown>) };
}

export async function softDeleteItem(itemId: string, householdId: string, userId: string) {
  const repositories = await getInventoryRepositories();
  const row = await repositories.items.softDelete(itemId, householdId);
  if (!row) throw new AppError(404, 'Item not found', 'NOT_FOUND');
  await recordItemActivity(itemId, userId, 'updated', { deleted: true });
  return { deleted: true, id: itemId };
}

export async function restoreItem(itemId: string, householdId: string, userId: string) {
  const repositories = await getInventoryRepositories();
  const row = await repositories.items.restore(itemId, householdId);
  if (!row) throw new AppError(404, 'Deleted item not found', 'NOT_FOUND');
  await recordItemActivity(itemId, userId, 'updated', { restored: true });
  return { item: mapItem(row as unknown as Record<string, unknown>) };
}
