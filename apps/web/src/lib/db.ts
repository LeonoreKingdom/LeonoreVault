import Dexie, { type Table } from 'dexie';

// ─── Row types (matching API shapes) ────────────────────────

export interface DbItem {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  locationId: string | null;
  quantity: number;
  tags: string[];
  status: string;
  createdBy: string;
  borrowedBy: string | null;
  borrowDueDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DbCategory {
  id: string;
  householdId: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbLocation {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbMeta {
  key: string;          // e.g. "items_sync_<householdId>"
  syncedAt: number;     // Date.now() timestamp
}

export interface DbSyncQueueItem {
  id?: number;          // Auto-incremented
  type: 'create' | 'update' | 'delete';
  table: string;        // e.g. "items"
  entityId: string;     // UUID of the entity
  payload: Record<string, unknown>;
  householdId: string;
  createdAt: string;    // ISO timestamp
}

// ─── Dexie Instance ─────────────────────────────────────────

class VaultDB extends Dexie {
  items!: Table<DbItem, string>;
  categories!: Table<DbCategory, string>;
  locations!: Table<DbLocation, string>;
  _meta!: Table<DbMeta, string>;
  syncQueue!: Table<DbSyncQueueItem, number>;

  constructor() {
    super('leonorevault');

    this.version(1).stores({
      items: 'id, householdId, categoryId, locationId, status, updatedAt',
      categories: 'id, householdId',
      locations: 'id, householdId, parentId',
      _meta: 'key',
    });

    this.version(2).stores({
      items: 'id, householdId, categoryId, locationId, status, updatedAt',
      categories: 'id, householdId',
      locations: 'id, householdId, parentId',
      _meta: 'key',
      syncQueue: '++id, householdId, table, entityId',
    });
  }
}

export const db = new VaultDB();

// ─── Helpers ────────────────────────────────────────────────

const STALE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a table's data for a household is still fresh.
 */
export async function isFresh(table: string, householdId: string): Promise<boolean> {
  const key = `${table}_sync_${householdId}`;
  const meta = await db._meta.get(key);
  if (!meta) return false;
  return Date.now() - meta.syncedAt < STALE_MS;
}

/**
 * Mark a table's data for a household as synced now.
 */
export async function markSynced(table: string, householdId: string): Promise<void> {
  const key = `${table}_sync_${householdId}`;
  await db._meta.put({ key, syncedAt: Date.now() });
}
