import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

// ─── Types ──────────────────────────────────────────────────

interface SyncMutation {
  type: 'create' | 'update' | 'delete';
  table: string;
  entityId: string;
  payload: Record<string, unknown>;
  updatedAt: string; // ISO timestamp from client
}

interface SyncResult {
  entityId: string;
  type: string;
  status: 'applied' | 'conflict' | 'error';
  serverVersion?: Record<string, unknown>;
  message?: string;
}

// ─── Map DB rows to API shapes (camelCase) ──────────────────

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

// ─── Service ────────────────────────────────────────────────

/**
 * Process a batch of offline mutations using last-write-wins.
 */
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
        conflicts.push({
          entityId: mutation.entityId,
          type: mutation.type,
          status: 'error',
          message: `Sync not supported for table: ${mutation.table}`,
        });
        continue;
      }

      switch (mutation.type) {
        case 'create':
          await handleCreate(householdId, userId, mutation, applied);
          break;
        case 'update':
          await handleUpdate(householdId, mutation, applied, conflicts);
          break;
        case 'delete':
          await handleDelete(householdId, mutation, applied, conflicts);
          break;
        default:
          conflicts.push({
            entityId: mutation.entityId,
            type: mutation.type,
            status: 'error',
            message: `Unknown mutation type: ${mutation.type}`,
          });
      }
    } catch (err) {
      logger.error({ err, mutation }, 'Sync mutation failed');
      conflicts.push({
        entityId: mutation.entityId,
        type: mutation.type,
        status: 'error',
        message: (err as Error).message,
      });
    }
  }

  return { applied, conflicts };
}

// ─── Mutation handlers ──────────────────────────────────────

async function handleCreate(
  householdId: string,
  userId: string,
  mutation: SyncMutation,
  applied: SyncResult[],
) {
  const p = mutation.payload;

  const insertData: Record<string, unknown> = {
    id: mutation.entityId, // Use client-generated UUID
    household_id: householdId,
    created_by: userId,
    name: p.name,
    description: p.description ?? null,
    category_id: p.categoryId ?? p.category_id ?? null,
    location_id: p.locationId ?? p.location_id ?? null,
    quantity: p.quantity ?? 1,
    tags: (p.tags as string[]) ?? [],
    status: p.status ?? 'stored',
  };

  const { data, error } = await supabaseAdmin
    .from('items')
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    throw new AppError(500, `Failed to sync-create item: ${error.message}`, 'SYNC_ERROR');
  }

  applied.push({
    entityId: mutation.entityId,
    type: 'create',
    status: 'applied',
    serverVersion: mapItem(data),
  });
}

async function handleUpdate(
  householdId: string,
  mutation: SyncMutation,
  applied: SyncResult[],
  conflicts: SyncResult[],
) {
  // Fetch current server version
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('items')
    .select('*')
    .eq('id', mutation.entityId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !current) {
    conflicts.push({
      entityId: mutation.entityId,
      type: 'update',
      status: 'error',
      message: 'Item not found on server',
    });
    return;
  }

  // Last-write-wins: compare timestamps
  const serverUpdatedAt = new Date(current.updated_at as string).getTime();
  const clientUpdatedAt = new Date(mutation.updatedAt).getTime();

  if (serverUpdatedAt > clientUpdatedAt) {
    // Server is newer — conflict, keep server version
    conflicts.push({
      entityId: mutation.entityId,
      type: 'update',
      status: 'conflict',
      serverVersion: mapItem(current),
      message: 'Server version is newer',
    });
    return;
  }

  // Client wins — apply update
  const p = mutation.payload;
  const updateData: Record<string, unknown> = {};
  if (p.name !== undefined) updateData.name = p.name;
  if (p.description !== undefined) updateData.description = p.description;
  if (p.categoryId !== undefined) updateData.category_id = p.categoryId;
  if (p.category_id !== undefined) updateData.category_id = p.category_id;
  if (p.locationId !== undefined) updateData.location_id = p.locationId;
  if (p.location_id !== undefined) updateData.location_id = p.location_id;
  if (p.quantity !== undefined) updateData.quantity = p.quantity;
  if (p.tags !== undefined) updateData.tags = p.tags;
  if (p.status !== undefined) updateData.status = p.status;

  const { data, error } = await supabaseAdmin
    .from('items')
    .update(updateData)
    .eq('id', mutation.entityId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) {
    throw new AppError(500, `Failed to sync-update item: ${error.message}`, 'SYNC_ERROR');
  }

  applied.push({
    entityId: mutation.entityId,
    type: 'update',
    status: 'applied',
    serverVersion: mapItem(data),
  });
}

async function handleDelete(
  householdId: string,
  mutation: SyncMutation,
  applied: SyncResult[],
  conflicts: SyncResult[],
) {
  // Check if item exists
  const { data: current } = await supabaseAdmin
    .from('items')
    .select('id, updated_at')
    .eq('id', mutation.entityId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .single();

  if (!current) {
    // Already deleted or doesn't exist — mark as applied
    applied.push({
      entityId: mutation.entityId,
      type: 'delete',
      status: 'applied',
    });
    return;
  }

  // Soft-delete
  const { error } = await supabaseAdmin
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', mutation.entityId)
    .eq('household_id', householdId);

  if (error) {
    conflicts.push({
      entityId: mutation.entityId,
      type: 'delete',
      status: 'error',
      message: `Failed to delete: ${error.message}`,
    });
    return;
  }

  applied.push({
    entityId: mutation.entityId,
    type: 'delete',
    status: 'applied',
  });
}
