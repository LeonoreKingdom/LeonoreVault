'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useItemsStore } from '@/stores/items';
import ItemCard from '@/components/items/ItemCard';
import ItemFiltersBar from '@/components/items/ItemFilters';
import Link from 'next/link';
import { Plus, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/**
 * Item List page with search, filters, and pagination.
 */
export default function ItemsPage() {
  const { membership } = useAuthStore();
  const { items, pagination, filters, loading, error, fetchItems, setFilters } = useItemsStore();

  const householdId = membership?.householdId;

  // Fetch items when filters or householdId changes
  useEffect(() => {
    if (householdId) {
      fetchItems(householdId);
    }
  }, [householdId, filters, fetchItems]);

  const handleFilterChange = useCallback(
    (newFilters: Parameters<typeof setFilters>[0]) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  const goToPage = (page: number) => {
    setFilters({ page });
  };

  if (!membership) {
    return (
      <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
        <Package size={48} className="text-muted-light mb-4" />
        <h2 className="mb-2 text-xl font-bold">No Household</h2>
        <p className="text-muted max-w-md">Join or create a household to start managing items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Items</h1>
          <p className="text-muted mt-1">
            {pagination.total > 0
              ? `${pagination.total} item${pagination.total !== 1 ? 's' : ''} in your inventory`
              : 'Your household inventory'}
          </p>
        </div>
        <Link
          href="/items/new"
          className="from-primary to-accent flex items-center gap-2 self-start rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
        >
          <Plus size={18} />
          Add Item
        </Link>
      </div>

      {/* Filters */}
      <ItemFiltersBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {/* Items Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
          <div className="from-primary/20 to-accent/20 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
            <Package size={32} className="text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">
            {filters.search || filters.status ? 'No Items Found' : 'No Items Yet'}
          </h2>
          <p className="text-muted mb-6 max-w-md">
            {filters.search || filters.status
              ? 'Try adjusting your search or filters.'
              : 'Start tracking your belongings by adding your first item.'}
          </p>
          {!filters.search && !filters.status && (
            <Link
              href="/items/new"
              className="from-primary to-accent rounded-xl bg-gradient-to-r px-5 py-2.5 font-medium text-white shadow-md transition-opacity hover:opacity-90"
            >
              Add First Item
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="border-border hover:bg-hover disabled:text-muted-light flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-muted px-3 text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="border-border hover:bg-hover disabled:text-muted-light flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
