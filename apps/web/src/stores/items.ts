'use client';

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
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
    set({ loading: true, error: null });
    try {
      const { filters } = get();
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
      set({ items: data.items, pagination: data.pagination, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchItem: async (householdId, itemId) => {
    set({ loading: true, error: null });
    try {
      const data = await apiGet<{ item: Item }>(
        `/api/households/${householdId}/items/${itemId}`,
      );
      set({ selectedItem: data.item, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createItem: async (householdId, payload) => {
    const data = await apiPost<{ item: Item }>(
      `/api/households/${householdId}/items`,
      payload,
    );
    // Prepend to items list
    set((state) => ({
      items: [data.item, ...state.items],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    }));
    return data.item;
  },

  updateItem: async (householdId, itemId, payload) => {
    const data = await apiPatch<{ item: Item }>(
      `/api/households/${householdId}/items/${itemId}`,
      payload,
    );
    // Update in list and selected
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? data.item : i)),
      selectedItem: state.selectedItem?.id === itemId ? data.item : state.selectedItem,
    }));
    return data.item;
  },

  updateStatus: async (householdId, itemId, payload) => {
    const data = await apiPatch<{ item: Item }>(
      `/api/households/${householdId}/items/${itemId}/status`,
      payload,
    );
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? data.item : i)),
      selectedItem: state.selectedItem?.id === itemId ? data.item : state.selectedItem,
    }));
    return data.item;
  },

  deleteItem: async (householdId, itemId) => {
    await apiDelete(`/api/households/${householdId}/items/${itemId}`);
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
      selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
      pagination: { ...state.pagination, total: state.pagination.total - 1 },
    }));
  },

  clearSelected: () => set({ selectedItem: null }),
  clearError: () => set({ error: null }),
}));
