'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ITEM_STATUSES, STATUS_CONFIG } from '@leonorevault/shared';
import type { ItemFilters } from '@/stores/items';

interface ItemFiltersBarProps {
  filters: ItemFilters;
  onFilterChange: (filters: Partial<ItemFilters>) => void;
}

/**
 * Debounced search + filter bar for item list.
 */
export default function ItemFiltersBar({ filters, onFilterChange }: ItemFiltersBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search handler
  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFilterChange({ search: value || undefined, page: 1 });
      }, 300);
    },
    [onFilterChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const clearSearch = () => {
    if (searchRef.current) searchRef.current.value = '';
    onFilterChange({ search: undefined, page: 1 });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search
          size={18}
          className="text-muted-light pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search items..."
          defaultValue={filters.search || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="border-border bg-surface focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2.5 pl-10 pr-9 text-sm transition-all focus:outline-none focus:ring-2"
        />
        {filters.search && (
          <button
            onClick={clearSearch}
            className="text-muted hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-muted hidden sm:block" />
        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ status: e.target.value || undefined, page: 1 })}
          className="border-border bg-surface focus:border-primary rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none"
        >
          <option value="">All Statuses</option>
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={`${filters.sort}_${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('_');
            onFilterChange({ sort, order, page: 1 });
          }}
          className="border-border bg-surface focus:border-primary rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none"
        >
          <option value="updated_at_desc">Recently Updated</option>
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
      </div>
    </div>
  );
}
