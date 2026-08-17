import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

interface SyncMutation {
  type: 'create' | 'update' | 'delete';
  table: string;
  entityId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

interface SyncResult {
  entityId: string;
  type: string;
  status: 'applied' | 'conflict' | 'error';
  serverVersion?: Record<string, unknown>;
  message?: string;
}

function mapItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    householdId: row.householdId,
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

export async function processSyncBatch(
  householdId: string,
  userId: string,
  mutations: SyncMutation[],
): Promise<{ applied: SyncResult[]; conflicts: SyncResult[] }> {
  const applied: SyncResult[] = [];
  const conflicts: SyncResult[] = [];
  for (const mutation of mutations) {
    try {
      if (mutation.table !== 'items') {
        conflicts.push({ entityId: mutation.entityId, type: mutation.type, status: 'error', message: `Sync not supported for table: ${mutation.table}` });
        continue;
      }
      if (mutation.type === 'create') await handleCreate(householdId, userId, mutation, applied);
      else if (mutation.type === 'update') await handleUpdate(householdId, mutation, applied, conflicts);
      else if (mutation.type === 'delete') await handleDelete(householdId, mutation, applied, conflicts);
      else conflicts.push({ entityId: mutation.entityId, type: mutation.type, status: 'error', message: `Unknown mutation type: ${mutation.type}` });
    } catch (err) {
      logger.error({ err, mutation }, 'Sync mutation failed');
      conflicts.push({ entityId: mutation.entityId, type: mutation.type, status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }
  return { applied, conflicts };
}

async function handleCreate(
  householdId: string,
  userId: string,
  mutation: SyncMutation,
  applied: SyncResult[],
) {
  const p = mutation.payload;
  const repositories = await getInventoryRepositories();
  const row = await repositories.items.create({
    id: mutation.entityId,
    householdId,
    createdBy: userId,
    name: String(p.name ?? ''),
    description: (p.description as string | null | undefined) ?? null,
    categoryId: (p.categoryId ?? p.category_id ?? null) as string | null,
    locationId: (p.locationId ?? p.location_id ?? null) as string | null,
    quantity: Number(p.quantity ?? 1),
    tags: (p.tags as string[]) ?? [],
    status: (p.status as 'stored' | 'borrowed' | 'lost' | 'in_lost_found') ?? 'stored',
  });
  if (!row) throw new AppError(500, 'Failed to sync-create item', 'SYNC_ERROR');
  applied.push({ entityId: mutation.entityId, type: 'create', status: 'applied', serverVersion: mapItem(row as unknown as Record<string, unknown>) });
}

async function handleUpdate(
  householdId: string,
  mutation: SyncMutation,
  applied: SyncResult[],
  conflicts: SyncResult[],
) {
  const repositories = await getInventoryRepositories();
  const current = await repositories.items.findById(mutation.entityId, householdId);
  if (!current || current.deletedAt) {
    conflicts.push({ entityId: mutation.entityId, type: 'update', status: 'error', message: 'Item not found on server' });
    return;
  }
  if (current.updatedAt.getTime() > new Date(mutation.updatedAt).getTime()) {
    conflicts.push({ entityId: mutation.entityId, type: 'update', status: 'conflict', serverVersion: mapItem(current as unknown as Record<string, unknown>), message: 'Server version is newer' });
    return;
  }
  const p = mutation.payload;
  const updateData: Record<string, unknown> = {};
  if (p.name !== undefined) updateData.name = p.name;
  if (p.description !== undefined) updateData.description = p.description;
  if (p.categoryId !== undefined || p.category_id !== undefined) updateData.categoryId = p.categoryId ?? p.category_id;
  if (p.locationId !== undefined || p.location_id !== undefined) updateData.locationId = p.locationId ?? p.location_id;
  if (p.quantity !== undefined) updateData.quantity = p.quantity;
  if (p.tags !== undefined) updateData.tags = p.tags;
  if (p.status !== undefined) updateData.status = p.status;
  const row = await repositories.items.update(mutation.entityId, householdId, updateData as never);
  if (!row) throw new AppError(500, 'Failed to sync-update item', 'SYNC_ERROR');
  applied.push({ entityId: mutation.entityId, type: 'update', status: 'applied', serverVersion: mapItem(row as unknown as Record<string, unknown>) });
}

async function handleDelete(
  householdId: string,
  mutation: SyncMutation,
  applied: SyncResult[],
  _conflicts: SyncResult[],
) {
  const repositories = await getInventoryRepositories();
  const current = await repositories.items.findById(mutation.entityId, householdId);
  if (current && !current.deletedAt) {
    const deleted = await repositories.items.softDelete(mutation.entityId, householdId);
    if (!deleted) throw new AppError(500, 'Failed to sync-delete item', 'SYNC_ERROR');
  }
  applied.push({ entityId: mutation.entityId, type: 'delete', status: 'applied' });
}
