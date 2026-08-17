'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Grid2X2,
  Loader2,
  MapPin,
  Package,
  Plus,
  Tag,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import {
  flattenInventoryTree,
  formatStatus,
  formatUpdatedAt,
  labelFor,
  statusClass,
  type InventoryTreeNode,
} from '@/lib/inventory-data';
import { type Item, useItemsStore } from '@/stores/items';
import { useAuthStore } from '@/stores/auth';

type TreeResponse = { tree: InventoryTreeNode[] };

export default function ItemsPage() {
  const { user, membership } = useAuthStore();
  const { items, loading, error, fetchItems } = useItemsStore();
  const [categories, setCategories] = useState<InventoryTreeNode[]>([]);
  const [locations, setLocations] = useState<InventoryTreeNode[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const householdId = membership?.householdId;
    if (!householdId) return;
    let cancelled = false;
    void Promise.all([
      fetchItems(householdId),
      apiGet<TreeResponse>(`/api/households/${householdId}/categories`),
      apiGet<TreeResponse>(`/api/households/${householdId}/locations`),
    ])
      .then(([, categoryResponse, locationResponse]) => {
        if (cancelled) return;
        setCategories(categoryResponse.tree);
        setLocations(locationResponse.tree);
      })
      .catch((requestError) => {
        if (!cancelled) setLoadError((requestError as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchItems, membership?.householdId]);

  const categoryMap = useMemo(
    () => new Map(flattenInventoryTree(categories).map((node) => [node.id, node])),
    [categories],
  );
  const locationMap = useMemo(
    () => new Map(flattenInventoryTree(locations).map((node) => [node.id, node])),
    [locations],
  );
  const storedCount = items.filter((item) => item.status === 'stored').length;
  const checkedOutCount = items.filter((item) => item.status === 'borrowed').length;
  const needsReviewCount = items.filter((item) => item.status === 'lost' || item.status === 'in_lost_found').length;
  const assignedCount = items.filter((item) => item.locationId).length;
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
            <Package size={16} />
            <span>Our Home</span><span className="text-muted-light">/</span>
            <span className="text-muted font-normal">Items</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Your inventory, {firstName}</h1>
          <p className="text-muted mt-1">Every item below is loaded from Turso through the live API.</p>
        </div>
        <Link href="/items/new" className="from-primary to-accent inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:self-auto">
          <Plus size={17} /> Add item
        </Link>
      </header>

      {!membership && <StateCard message="No household membership is available for this account." />}
      {(error || loadError) && <StateCard message={error ?? loadError ?? 'Failed to load inventory.'} danger />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Inventory summary">
        <SummaryCard icon={Package} label="Total items" value={items.length} detail="in Turso" tone="primary" />
        <SummaryCard icon={CheckCircle2} label="Stored" value={storedCount} detail="in their place" tone="success" />
        <SummaryCard icon={Clock3} label="Checked out" value={checkedOutCount} detail="currently loaned" tone="accent" />
        <SummaryCard icon={Grid2X2} label="Needs review" value={needsReviewCount} detail={`${assignedCount} with a location`} tone="warning" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-4" aria-labelledby="items-heading">
          <div className="flex items-end justify-between gap-3">
            <div><h2 id="items-heading" className="text-lg font-bold">Your items</h2><p className="text-muted mt-0.5 text-sm">Live metadata from Turso; no local inventory fixtures.</p></div>
            <span className="text-muted text-xs font-medium">{items.length} items</span>
          </div>
          {loading && items.length === 0 ? <LoadingState /> : items.length === 0 ? <StateCard message="No items are stored for this household yet." /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{items.map((item) => <ItemCard key={item.id} item={item} categoryMap={categoryMap} locationMap={locationMap} />)}</div>
          )}
        </section>

        <aside className="space-y-6" aria-label="Inventory details">
          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3"><div><div className="bg-primary/10 text-primary mb-3 flex h-9 w-9 items-center justify-center rounded-xl"><Grid2X2 size={18} /></div><h2 className="font-bold">Inventory health</h2><p className="text-muted mt-0.5 text-sm">Calculated from the live item set.</p></div><span className="text-primary text-sm font-bold">{items.length ? Math.round((assignedCount / items.length) * 100) : 0}%</span></div>
            <div className="bg-hover h-2 overflow-hidden rounded-full"><div className="from-primary to-accent h-full rounded-full bg-gradient-to-r" style={{ width: `${items.length ? (assignedCount / items.length) * 100 : 0}%` }} /></div>
            <p className="text-muted mt-2 text-xs">{assignedCount} of {items.length} items have a location.</p>
            <div className="border-border mt-5 space-y-3 border-t pt-4"><MetricRow label="Items with a location" value={String(assignedCount)} tone="text-success" /><MetricRow label="Items to organize" value={String(items.length - assignedCount)} tone="text-warning" /><MetricRow label="Data source" value="Turso" tone="text-accent" /></div>
          </section>
          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-bold">Quick tip</h2><p className="text-muted mt-0.5 text-sm">Keep the map current.</p></div><ArrowUpRight size={17} className="text-muted-light" /></div><p className="text-muted text-sm leading-relaxed">Add a location whenever you bring something new home.</p><Link href="/locations" className="text-primary mt-4 inline-flex items-center gap-1.5 text-xs font-semibold">Explore storage spots <ArrowUpRight size={14} /></Link></section>
        </aside>
      </div>
    </div>
  );
}

function ItemCard({ item, categoryMap, locationMap }: { item: Item; categoryMap: Map<string, InventoryTreeNode>; locationMap: Map<string, InventoryTreeNode> }) {
  return <Link href={`/items/${item.id}`} className="border-border bg-surface hover:border-primary/30 group flex min-w-0 flex-col rounded-2xl border p-5 transition-all hover:shadow-md"><div className="mb-4 flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Package size={20} /></div><div className="min-w-0"><h3 className="truncate font-semibold">{item.name}</h3><p className="text-muted mt-0.5 truncate text-sm">{labelFor(categoryMap, item.categoryId)}</p></div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(item.status)}`}>{formatStatus(item.status)}</span></div><div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"><span className="flex min-w-0 items-center gap-1.5"><MapPin size={14} /><span className="truncate">{labelFor(locationMap, item.locationId)}</span></span><span className="flex items-center gap-1.5"><Tag size={14} /><span>{item.quantity} {item.quantity === 1 ? 'unit' : 'units'}</span></span></div><div className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-3"><div className="flex min-w-0 gap-1">{item.tags.slice(0, 3).map((tag) => <span key={tag} className="bg-hover text-muted truncate rounded-full px-2 py-0.5 text-xs">{tag}</span>)}</div><span className="text-muted-light shrink-0 text-[10px]">{formatUpdatedAt(item.updatedAt)}</span></div></Link>;
}

function LoadingState() { return <div className="border-border bg-surface flex items-center justify-center rounded-2xl border py-16 text-center"><Loader2 className="text-primary animate-spin" size={28} /></div>; }
function StateCard({ message, danger = false }: { message: string; danger?: boolean }) { return <div className={`${danger ? 'bg-danger/10 text-danger' : 'border-border bg-surface text-muted'} rounded-2xl border px-5 py-6 text-sm`}>{message}</div>; }
function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof Package; label: string; value: number; detail: string; tone: 'primary' | 'success' | 'warning' | 'accent' }) { const styles = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', accent: 'bg-accent/10 text-accent' }; return <div className="border-border bg-surface min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${styles[tone]}`}><Icon size={18} /></div><p className="text-muted truncate text-xs font-medium sm:text-sm">{label}</p><div className="mt-1 flex items-baseline gap-2"><p className="text-2xl font-bold tracking-tight">{value}</p><p className="text-muted-light hidden text-xs sm:block">{detail}</p></div></div>; }
function MetricRow({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span className={`truncate font-semibold ${tone}`}>{value}</span></div>; }
