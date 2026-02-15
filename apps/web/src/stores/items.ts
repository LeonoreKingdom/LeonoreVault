'use client';

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { db, isFresh, markSynced, type DbItem } from '@/lib/db';
import type {
  CreateItemSchema,
  UpdateItemSchema,
  UpdateItemStatusSchema,
} from '@leonorevault/shared';

// ─── Types ──────────────────────────────────────────────────

export interface Item {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  locationId: string | null;
  quantity: number;
  tags: string[];
  status: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
  createdBy: string;
  borrowedBy: string | null;
  borrowDueDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ItemFilters {
  search?: string;
  status?: string;
  category_id?: string;
  location_id?: string;
  sort: string;
  order: string;
  page: number;
  limit: number;
}

interface ItemsState {
  items: Item[];
  selectedItem: Item | null;
  pagination: Pagination;
  filters: ItemFilters;
  loading: boolean;
  error: string | null;

  // Actions
  setFilters: (filters: Partial<ItemFilters>) => void;
  fetchItems: (householdId: string) => Promise<void>;
  fetchItem: (householdId: string, itemId: string) => Promise<void>;
  createItem: (householdId: string, payload: CreateItemSchema) => Promise<Item>;
  updateItem: (householdId: string, itemId: string, payload: UpdateItemSchema) => Promise<Item>;
  updateStatus: (householdId: string, itemId: string, payload: UpdateItemStatusSchema) => Promise<Item>;
  deleteItem: (householdId: string, itemId: string) => Promise<void>;
  clearSelected: () => void;
  clearError: () => void;
}

// ─── Default filters ────────────────────────────────────────

const DEFAULT_FILTERS: ItemFilters = {
  sort: 'updated_at',
  order: 'desc',
  page: 1,
  limit: 20,
};

// ─── Helpers ────────────────────────────────────────────────

/** Apply client-side filtering/sorting to cached items. */
function applyCacheFilters(items: DbItem[], filters: ItemFilters): { items: Item[]; total: number } {
  let result = items.filter((i) => !i.deletedAt);

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)),
    );
  }

  // Status
  if (filters.status) {
    result = result.filter((i) => i.status === filters.status);
  }

  // Category
  if (filters.category_id) {
    result = result.filter((i) => i.categoryId === filters.category_id);
  }

  // Location
  if (filters.location_id) {
    result = result.filter((i) => i.locationId === filters.location_id);
  }

  const total = result.length;

  // Sort
  const sortKey = filters.sort === 'updated_at' ? 'updatedAt' : filters.sort === 'created_at' ? 'createdAt' : 'name';
  const dir = filters.order === 'asc' ? 1 : -1;
  result.sort((a, b) => {
    const av = String(a[sortKey as keyof DbItem] ?? '');
    const bv = String(b[sortKey as keyof DbItem] ?? '');
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  // Paginate
  const start = (filters.page - 1) * filters.limit;
  const page = result.slice(start, start + filters.limit) as Item[];

  return { items: page, total };
}

// ─── Store ──────────────────────────────────────────────────

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  selectedItem: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  filters: { ...DEFAULT_FILTERS },
  loading: false,
  error: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  fetchItems: async (householdId) => {
    const { filters } = get();

    // ── Phase 1: Serve from Dexie cache instantly ────────
    try {
      const cached = await db.items.where('householdId').equals(householdId).toArray();
      if (cached.length > 0) {
        const { items, total } = applyCacheFilters(cached, filters);
        set({
          items,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: Math.ceil(total / filters.limit),
          },
          loading: false,
        });
      }
    } catch {
      // IndexedDB unavailable — continue to API
    }

    // ── Phase 2: Background fetch from API ──────────────
    const fresh = await isFresh('items', householdId).catch(() => false);
    if (fresh) return; // Cache is still fresh, skip API call

    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = {
        page: String(filters.page),
        limit: String(filters.limit),
        sort: filters.sort,
        order: filters.order,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.location_id) params.location_id = filters.location_id;

      const data = await apiGet<{ items: Item[]; pagination: Pagination }>(
        `/api/households/${householdId}/items`,
        params,
      );

      // Update Zustand
      set({ items: data.items, pagination: data.pagination, loading: false });

      // Update Dexie cache
      try {
        await db.items.bulkPut(data.items as unknown as DbItem[]);
        await markSynced('items', householdId);
      } catch {
        // Dexie write failure is non-fatal
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchItem: async (householdId, itemId) => {
    // ── Phase 1: Try Dexie cache ────────────────────────
    try {
      const cached = await db.items.get(itemId);
      if (cached && cached.householdId === householdId) {
        set({ selectedItem: cached as unknown as Item, loading: false });
      }
    } catch {
      // Continue to API
    }

    // ── Phase 2: Fetch from API ─────────────────────────
    set({ loading: true, error: null });
    try {
      const data = await apiGet<{ item: Item }>(
        `/api/households/${householdId}/items/${itemId}`,
      );
      set({ selectedItem: data.item, loading: false });

      // Update Dexie
      try {
        await db.items.put(data.item as unknown as DbItem);
      } catch {
        // Non-fatal
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createItem: async (householdId, payload) => {
    // ── Offline: queue mutation ──────────────────────────
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: Item = {
        id,
        householdId,
        name: payload.name,
        description: payload.description ?? null,
        categoryId: payload.category_id ?? null,
        locationId: payload.location_id ?? null,
        quantity: payload.quantity ?? 1,
        tags: payload.tags ?? [],
        status: (payload.status as Item['status']) ?? 'stored',
        createdBy: '',
        borrowedBy: null,
        borrowDueDate: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      set((state) => ({
        items: [optimistic, ...state.items],
        pagination: { ...state.pagination, total: state.pagination.total + 1 },
      }));
      try {
        await db.items.put(optimistic as unknown as DbItem);
        await db.syncQueue.add({
          type: 'create',
          table: 'items',
          entityId: id,
          payload: payload as unknown as Record<string, unknown>,
          householdId,
          createdAt: now,
        });
      } catch { /* Non-fatal */ }
      return optimistic;
    }

    // ── Online: normal API call ──────────────────────────
    const data = await apiPost<{ item: Item }>(
      `/api/households/${householdId}/items`,
      payload,
    );
    set((state) => ({
      items: [data.item, ...state.items],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    }));
    try {
      await db.items.put(data.item as unknown as DbItem);
    } catch { /* Non-fatal */ }
    return data.item;
  },

  updateItem: async (householdId, itemId, payload) => {
    // ── Offline: queue mutation ──────────────────────────
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const now = new Date().toISOString();
      set((state) => {
        const updated = state.items.map((i) =>
          i.id === itemId ? { ...i, ...payload, updatedAt: now } as Item : i,
        );
        return {
          items: updated,
          selectedItem: state.selectedItem?.id === itemId
            ? { ...state.selectedItem, ...payload, updatedAt: now } as Item
            : state.selectedItem,
        };
      });
      try {
        const existing = await db.items.get(itemId);
        if (existing) await db.items.put({ ...existing, ...payload, updatedAt: now } as DbItem);
        await db.syncQueue.add({
          type: 'update',
          table: 'items',
          entityId: itemId,
          payload: payload as unknown as Record<string, unknown>,
          householdId,
          createdAt: now,
        });
      } catch { /* Non-fatal */ }
      const item = get().items.find((i) => i.id === itemId);
      return item!;
    }

    // ── Online ──────────────────────────────────────────
    const data = await apiPatch<{ item: Item }>(
      `/api/households/${householdId}/items/${itemId}`,
      payload,
    );
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? data.item : i)),
      selectedItem: state.selectedItem?.id === itemId ? data.item : state.selectedItem,
    }));
    try {
      await db.items.put(data.item as unknown as DbItem);
    } catch { /* Non-fatal */ }
    return data.item;
  },

  updateStatus: async (householdId, itemId, payload) => {
    // ── Offline: queue mutation ──────────────────────────
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const now = new Date().toISOString();
      set((state) => {
        const updated = state.items.map((i) =>
          i.id === itemId ? { ...i, status: payload.status as Item['status'], updatedAt: now } : i,
        );
        return {
          items: updated,
          selectedItem: state.selectedItem?.id === itemId
            ? { ...state.selectedItem, status: payload.status as Item['status'], updatedAt: now }
            : state.selectedItem,
        };
      });
      try {
        const existing = await db.items.get(itemId);
        if (existing) await db.items.put({ ...existing, status: payload.status, updatedAt: now } as DbItem);
        await db.syncQueue.add({
          type: 'update',
          table: 'items',
          entityId: itemId,
          payload: payload as unknown as Record<string, unknown>,
          householdId,
          createdAt: now,
        });
      } catch { /* Non-fatal */ }
      const item = get().items.find((i) => i.id === itemId);
      return item!;
    }

    // ── Online ──────────────────────────────────────────
    const data = await apiPatch<{ item: Item }>(
      `/api/households/${householdId}/items/${itemId}/status`,
      payload,
    );
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? data.item : i)),
      selectedItem: state.selectedItem?.id === itemId ? data.item : state.selectedItem,
    }));
    try {
      await db.items.put(data.item as unknown as DbItem);
    } catch { /* Non-fatal */ }
    return data.item;
  },

  deleteItem: async (householdId, itemId) => {
    // ── Offline: queue mutation ──────────────────────────
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
        selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
        pagination: { ...state.pagination, total: state.pagination.total - 1 },
      }));
      try {
        await db.items.delete(itemId);
        await db.syncQueue.add({
          type: 'delete',
          table: 'items',
          entityId: itemId,
          payload: {},
          householdId,
          createdAt: new Date().toISOString(),
        });
      } catch { /* Non-fatal */ }
      return;
    }

    // ── Online ──────────────────────────────────────────
    await apiDelete(`/api/households/${householdId}/items/${itemId}`);
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
      selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
      pagination: { ...state.pagination, total: state.pagination.total - 1 },
    }));
    try {
      await db.items.delete(itemId);
    } catch { /* Non-fatal */ }
  },

  clearSelected: () => set({ selectedItem: null }),
  clearError: () => set({ error: null }),
}));
