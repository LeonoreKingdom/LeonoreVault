'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LayoutGrid,
  MapPin,
  Package,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

type ItemStatus = 'in-storage' | 'checked-out';

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  status: ItemStatus;
  recentlyReturned?: string;
  borrowedBy?: string;
  dueLabel?: string;
};

type Filter = 'All items' | 'In storage' | 'Checked out' | 'Returned recently';

const mockItems: InventoryItem[] = [
  {
    id: 'cordless-drill',
    name: 'Cordless drill',
    category: 'Tools',
    location: 'Garage shelf A',
    status: 'in-storage',
    recentlyReturned: 'Returned 2h ago',
  },
  {
    id: 'first-aid-kit',
    name: 'First aid kit',
    category: 'Health',
    location: 'Hallway cabinet',
    status: 'checked-out',
    borrowedBy: 'Maya',
    dueLabel: 'Due tomorrow',
  },
  {
    id: 'camping-lantern',
    name: 'Camping lantern',
    category: 'Outdoor',
    location: 'Storage room',
    status: 'in-storage',
    recentlyReturned: 'Returned yesterday',
  },
  {
    id: 'passport-folder',
    name: 'Passport folder',
    category: 'Documents',
    location: 'Office drawer',
    status: 'in-storage',
  },
  {
    id: 'camera-tripod',
    name: 'Camera tripod',
    category: 'Electronics',
    location: 'Media cabinet',
    status: 'in-storage',
  },
  {
    id: 'board-games',
    name: 'Board games',
    category: 'Entertainment',
    location: 'Living room shelf',
    status: 'checked-out',
    borrowedBy: 'Rafi',
    dueLabel: 'Due in 3 days',
  },
];

const storageSpots = [
  { name: 'Garage shelf A', type: 'Shelf', itemCount: 8, color: 'bg-primary' },
  { name: 'Hallway cabinet', type: 'Cabinet', itemCount: 5, color: 'bg-accent' },
  { name: 'Storage room', type: 'Room', itemCount: 12, color: 'bg-success' },
  { name: 'Office drawer', type: 'Drawer', itemCount: 4, color: 'bg-warning' },
];

const filters: Filter[] = ['All items', 'In storage', 'Checked out', 'Returned recently'];
const locationOptions = [
  'All locations',
  ...Array.from(new Set(mockItems.map((item) => item.location))),
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All items');
  const [locationFilter, setLocationFilter] = useState('All locations');

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const storedCount = mockItems.filter((item) => item.status === 'in-storage').length;
  const checkedOutCount = mockItems.filter((item) => item.status === 'checked-out').length;
  const returnedCount = mockItems.filter((item) => item.recentlyReturned).length;

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return mockItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.category, item.location].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      const matchesFilter =
        activeFilter === 'All items' ||
        (activeFilter === 'In storage' && item.status === 'in-storage') ||
        (activeFilter === 'Checked out' && item.status === 'checked-out') ||
        (activeFilter === 'Returned recently' && Boolean(item.recentlyReturned));
      const matchesLocation =
        locationFilter === 'All locations' || item.location === locationFilter;

      return matchesQuery && matchesFilter && matchesLocation;
    });
  }, [activeFilter, locationFilter, query]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} />
            <span>Our Home</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">Inventory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Good morning, {firstName}
          </h1>
          <p className="text-muted mt-1">Find what you need, right when you need it.</p>
        </div>
        <Link
          href="/items/new"
          className="from-primary to-accent inline-flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/15 transition-transform hover:-translate-y-0.5 hover:shadow-lg sm:self-auto"
        >
          <Plus size={18} />
          Add item
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Inventory summary">
        <SummaryCard
          icon={Package}
          label="Total items"
          value={mockItems.length}
          detail="in your home"
          tone="primary"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="In storage"
          value={storedCount}
          detail="ready to find"
          tone="success"
        />
        <SummaryCard
          icon={UserRound}
          label="Checked out"
          value={checkedOutCount}
          detail="with family"
          tone="warning"
        />
        <SummaryCard
          icon={Clock3}
          label="Returned recently"
          value={returnedCount}
          detail="last 48 hours"
          tone="accent"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 space-y-4" aria-labelledby="inventory-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="inventory-heading" className="text-lg font-bold">
                Your inventory
              </h2>
              <p className="text-muted mt-0.5 text-sm">
                Everything your household is keeping track of.
              </p>
            </div>
            <Link
              href="/items"
              className="text-primary inline-flex items-center gap-1 self-start text-sm font-semibold transition-opacity hover:opacity-75 sm:self-auto"
            >
              View all items
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="border-border bg-surface rounded-2xl border p-3 shadow-sm sm:p-4">
            <label className="relative block">
              <span className="sr-only">Search inventory</span>
              <Search
                size={18}
                className="text-muted-light pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search items, categories, or locations"
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:ring-2"
              />
            </label>
            <div
              className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-0.5"
              role="group"
              aria-label="Filter inventory"
            >
              {filters.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveFilter(filter)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:bg-hover hover:text-foreground'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
            <label className="text-muted relative mt-3 block text-xs font-medium sm:max-w-xs">
              <span className="sr-only">Filter by storage location</span>
              <MapPin
                size={15}
                className="text-muted-light pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              />
              <select
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                aria-label="Filter by storage location"
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full appearance-none rounded-xl border py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition-colors focus:ring-2"
              >
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => <InventoryRow key={item.id} item={item} />)
            ) : (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Search size={22} />
                </div>
                <h3 className="font-semibold">No matching items</h3>
                <p className="text-muted mt-1 max-w-xs text-sm">
                  Try another search term or switch to a different filter.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6" aria-label="Storage overview">
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="spots-heading"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="bg-accent/10 text-accent mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                  <LayoutGrid size={18} />
                </div>
                <h2 id="spots-heading" className="font-bold">
                  Storage spots
                </h2>
                <p className="text-muted mt-0.5 text-sm">Where your things live.</p>
              </div>
              <Link
                href="/locations"
                aria-label="View all storage spots"
                className="text-muted hover:text-primary rounded-lg p-1 transition-colors"
              >
                <ChevronRight size={19} />
              </Link>
            </div>
            <div className="space-y-1">
              {storageSpots.map((spot) => (
                <Link
                  key={spot.name}
                  href="/locations"
                  className="hover:bg-hover -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${spot.color}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{spot.name}</span>
                    <span className="text-muted block text-xs">{spot.type}</span>
                  </span>
                  <span className="text-muted text-xs">{spot.itemCount} items</span>
                </Link>
              ))}
            </div>
            <Link
              href="/locations"
              className="border-border text-muted hover:border-primary/30 hover:text-primary mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold transition-colors"
            >
              Manage storage spots
              <ArrowUpRight size={14} />
            </Link>
          </section>

          <section className="from-primary to-accent relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg shadow-indigo-500/15">
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Quick tip
              </p>
              <h2 className="mt-3 text-lg font-bold leading-snug">
                Scan a QR label to find an item faster.
              </h2>
              <Link
                href="/items/labels"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
              >
                Explore QR labels
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10" />
            <div className="absolute -bottom-12 -right-2 h-32 w-32 rounded-full border-[18px] border-white/10" />
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'accent';
}) {
  const toneStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="border-border bg-surface min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles[tone]}`}
      >
        <Icon size={18} />
      </div>
      <p className="text-muted truncate text-xs font-medium sm:text-sm">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-muted-light hidden text-xs sm:block">{detail}</p>
      </div>
    </div>
  );
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const isCheckedOut = item.status === 'checked-out';

  return (
    <Link
      href={`/items/${item.id}`}
      className="hover:bg-hover/60 group flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="from-primary/15 to-accent/15 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-105">
          <Package size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{item.name}</h3>
            {item.recentlyReturned && (
              <span className="bg-success/10 text-success rounded-full px-2 py-0.5 text-[10px] font-semibold">
                New return
              </span>
            )}
          </div>
          <div className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>{item.category}</span>
            <span className="text-muted-light">•</span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {item.location}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pl-[3.75rem] sm:justify-end sm:pl-0">
        <div className="text-left sm:text-right">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isCheckedOut ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isCheckedOut ? 'bg-warning' : 'bg-success'}`}
            />
            {isCheckedOut ? 'Checked out' : 'In storage'}
          </span>
          <p className="text-muted mt-1 text-xs">
            {isCheckedOut
              ? `${item.borrowedBy} · ${item.dueLabel}`
              : item.recentlyReturned || 'Ready to find'}
          </p>
        </div>
        <ArrowUpRight
          size={17}
          className="text-muted-light group-hover:text-primary shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
