'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Grid2X2,
  MapPin,
  Package,
  Plus,
  Tag,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

type MockItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  status: 'Stored' | 'Checked out' | 'Needs a home';
  updated: string;
  tags: string[];
};

const mockItems: MockItem[] = [
  {
    id: 'item-camera',
    name: 'Mirrorless camera',
    category: 'Electronics',
    location: 'Media cabinet',
    quantity: 1,
    status: 'Stored',
    updated: 'Updated today',
    tags: ['travel', 'fragile'],
  },
  {
    id: 'item-drill',
    name: 'Cordless drill',
    category: 'Tools',
    location: 'Tool cabinet',
    quantity: 1,
    status: 'Checked out',
    updated: 'Due in 3 days',
    tags: ['maintenance'],
  },
  {
    id: 'item-linens',
    name: 'Guest bed linens',
    category: 'Bedroom',
    location: 'Wardrobe',
    quantity: 2,
    status: 'Stored',
    updated: 'Updated yesterday',
    tags: ['seasonal'],
  },
  {
    id: 'item-board-games',
    name: 'Board game collection',
    category: 'Entertainment',
    location: 'Bookcase',
    quantity: 6,
    status: 'Stored',
    updated: 'Updated 2 days ago',
    tags: ['family', 'weekend'],
  },
  {
    id: 'item-spices',
    name: 'Everyday spice set',
    category: 'Kitchen',
    location: 'Pantry shelves',
    quantity: 12,
    status: 'Stored',
    updated: 'Updated 3 days ago',
    tags: ['daily use'],
  },
  {
    id: 'item-projector',
    name: 'Portable projector',
    category: 'Electronics',
    location: 'Media cabinet',
    quantity: 1,
    status: 'Checked out',
    updated: 'Due tomorrow',
    tags: ['loaned'],
  },
  {
    id: 'item-birthday',
    name: 'Birthday decorations',
    category: 'Events',
    location: 'Unassigned',
    quantity: 1,
    status: 'Needs a home',
    updated: 'Added this week',
    tags: ['party'],
  },
  {
    id: 'item-screw-set',
    name: 'Wood screw set',
    category: 'Tools',
    location: 'Workshop shelf',
    quantity: 4,
    status: 'Stored',
    updated: 'Updated last week',
    tags: ['maintenance', 'spares'],
  },
];

export default function ItemsPage() {
  const { user } = useAuthStore();
  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const storedCount = mockItems.filter((item) => item.status === 'Stored').length;
  const checkedOutCount = mockItems.filter((item) => item.status === 'Checked out').length;
  const needsHomeCount = mockItems.filter((item) => item.status === 'Needs a home').length;
  const locationCount = new Set(
    mockItems.filter((item) => item.location !== 'Unassigned').map((item) => item.location),
  ).size;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
            <Package size={16} />
            <span>Our Home</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">Items</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Everything has a place, {firstName}
          </h1>
          <p className="text-muted mt-1">A calm, searchable home for everything you own.</p>
        </div>
        <Link
          href="/items/new"
          className="from-primary to-accent inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 sm:self-auto"
        >
          <Plus size={17} />
          Add item
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Inventory summary">
        <SummaryCard
          icon={Package}
          label="Total items"
          value={mockItems.length}
          detail="in your inventory"
          tone="primary"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Stored"
          value={storedCount}
          detail="in their place"
          tone="success"
        />
        <SummaryCard
          icon={Clock3}
          label="Checked out"
          value={checkedOutCount}
          detail="currently loaned"
          tone="accent"
        />
        <SummaryCard
          icon={Grid2X2}
          label="Needs a home"
          value={needsHomeCount}
          detail={`${locationCount} active spots`}
          tone="warning"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-4" aria-labelledby="items-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="items-heading" className="text-lg font-bold">
                Your items
              </h2>
              <p className="text-muted mt-0.5 text-sm">Recently updated household inventory.</p>
            </div>
            <span className="text-muted text-xs font-medium">{mockItems.length} items</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mockItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        <aside className="space-y-6" aria-label="Inventory details">
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="inventory-health-heading"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="bg-primary/10 text-primary mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Grid2X2 size={18} />
                </div>
                <h2 id="inventory-health-heading" className="font-bold">
                  Inventory health
                </h2>
                <p className="text-muted mt-0.5 text-sm">Keep your home easy to navigate.</p>
              </div>
              <span className="text-primary text-sm font-bold">88%</span>
            </div>
            <div className="bg-hover h-2 overflow-hidden rounded-full">
              <div className="from-primary to-accent h-full w-[88%] rounded-full bg-gradient-to-r" />
            </div>
            <p className="text-muted mt-2 text-xs">7 of 8 items have a clear home and status.</p>
            <div className="border-border mt-5 space-y-3 border-t pt-4">
              <MetricRow label="Items with a location" value="7" tone="text-success" />
              <MetricRow label="Items to organize" value="1" tone="text-warning" />
              <MetricRow label="Most used area" value="Media cabinet" tone="text-accent" />
            </div>
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="item-tip-heading"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="item-tip-heading" className="font-bold">
                  Quick tip
                </h2>
                <p className="text-muted mt-0.5 text-sm">Small habit, less searching.</p>
              </div>
              <ArrowUpRight size={17} className="text-muted-light" />
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Add a location whenever you bring something new home. Your future self will thank you.
            </p>
            <Link
              href="/locations"
              className="text-primary mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              Explore storage spots
              <ArrowUpRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: MockItem }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="border-border bg-surface hover:border-primary/30 group flex min-w-0 flex-col rounded-2xl border p-5 transition-all duration-300 hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{item.name}</h3>
            <p className="text-muted mt-0.5 truncate text-sm">{item.category}</p>
          </div>
        </div>
        <StatusPill status={item.status} />
      </div>

      <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin size={14} />
          <span className="truncate">{item.location}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Tag size={14} />
          <span>
            {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
          </span>
        </span>
      </div>

      <div className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <div className="flex min-w-0 gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="bg-hover text-muted truncate rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-muted-light shrink-0 text-[10px]">{item.updated}</span>
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: MockItem['status'] }) {
  const styles = {
    Stored: 'bg-success/10 text-success',
    'Checked out': 'bg-primary/10 text-primary',
    'Needs a home': 'bg-warning/10 text-warning',
  };

  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Package;
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

function MetricRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`truncate font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
