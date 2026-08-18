'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Layers3,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { flattenInventoryTree, type InventoryTreeNode } from '@/lib/inventory-data';
import { SkeletonRow } from '@/components/Skeleton';
import { useAuthStore } from '@/stores/auth';

type ApiItem = { id: string; name: string; locationId: string | null };
type LocationNode = InventoryTreeNode & { parentId?: string | null; description?: string | null; children?: LocationNode[] };
type EditorState = { mode: 'create' | 'edit'; id: string | null; name: string; description: string; parentId: string };

export default function LocationsPage() {
  const { user, membership } = useAuthStore();
  const householdId = membership?.householdId;
  const canWrite = membership?.role === 'admin' || membership?.role === 'member';
  const canDelete = membership?.role === 'admin';
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    setError(null);
    try {
      const [locationResponse, itemResponse] = await Promise.all([
        apiGet<{ tree: LocationNode[] }>(`/api/households/${householdId}/locations`),
        apiGet<{ items: ApiItem[] }>(`/api/households/${householdId}/items`, { page: 1, limit: 100, sort: 'name', order: 'asc' }),
      ]);
      setLocations(locationResponse.tree);
      setItems(itemResponse.items);
      setSelectedId((current) => {
        const available = flattenInventoryTree(locationResponse.tree).some((node) => node.id === current);
        return available ? current : locationResponse.tree[0]?.id ?? null;
      });
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const flat = useMemo(() => flattenInventoryTree(locations), [locations]);
  const counts = useMemo(
    () => items.reduce((map, item) => {
      if (item.locationId) map.set(item.locationId, (map.get(item.locationId) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
    [items],
  );
  const selected = flat.find((location) => location.id === selectedId) ?? flat[0];
  const selectedItems = items.filter((item) => item.locationId === selected?.id);
  const filtered = useMemo(() => filterTree(locations, query), [locations, query]);
  const parentOptions = useMemo(() => {
    const editing = editor?.mode === 'edit' && editor.id ? flat.find((location) => location.id === editor.id) : undefined;
    const excluded = editing ? new Set(flattenInventoryTree(editing.children ?? []).map((node) => node.id)) : new Set<string>();
    if (editing) excluded.add(editing.id);
    return flat.filter((location) => !excluded.has(location.id));
  }, [editor, flat]);

  function startCreate(parentId: string | null = null) {
    setError(null);
    setEditor({ mode: 'create', id: null, name: '', description: '', parentId: parentId ?? '' });
  }

  function startEdit() {
    if (!selected) return;
    setError(null);
    setEditor({ mode: 'edit', id: selected.id, name: selected.name, description: selected.description ?? '', parentId: selected.parentId ?? '' });
  }

  async function saveLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!householdId || !editor || !editor.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: editor.name.trim(), description: editor.description.trim() || undefined, parent_id: editor.parentId || null };
      const response = editor.mode === 'create'
        ? await apiPost<{ location: LocationNode }>(`/api/households/${householdId}/locations`, payload)
        : await apiPatch<{ location: LocationNode }>(`/api/households/${householdId}/locations/${editor.id}`, payload);
      await loadData();
      setSelectedId(response.location.id);
      setEditor(null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation() {
    if (!householdId || !selected || !canDelete) return;
    const childCount = flattenInventoryTree(selected.children ?? []).length;
    const warning = childCount > 0
      ? `Delete ${selected.name}? Its ${childCount} nested location${childCount === 1 ? '' : 's'} will also be removed, and assigned items will become unassigned.`
      : `Delete ${selected.name}? Items assigned to it will become unassigned.`;
    if (!window.confirm(warning)) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/households/${householdId}/locations/${selected.id}`);
      setSelectedId(null);
      await loadData();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (!membership) return <StateCard message="No household membership is available for this account." />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold"><MapPin size={16} /><span>Our Home</span><span className="text-muted-light">/</span><span className="text-muted font-normal">Storage organization</span></div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Live storage map{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</h1>
          <p className="text-muted mt-1">Locations and assignments come from Turso.</p>
        </div>
        {canWrite ? <button type="button" onClick={() => startCreate()} className="from-primary to-accent inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:self-auto"><Plus size={17} /> New location</button> : <span className="bg-hover text-muted inline-flex items-center gap-2 self-start rounded-xl px-3.5 py-2.5 text-sm font-semibold sm:self-auto">View only</span>}
      </header>

      {error && <StateCard message={error} danger />}
      {loading ? <LoadingState /> : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard icon={Grid2X2} label="Storage spots" value={flat.length} detail="in Turso" tone="accent" />
            <SummaryCard icon={Package} label="Assigned items" value={items.filter((item) => item.locationId).length} detail="with a location" tone="primary" />
            <SummaryCard icon={Layers3} label="Nested levels" value={Math.max(...flat.map((location) => depth(location, locations)), 0) + (flat.length ? 1 : 0)} detail="in the live tree" tone="success" />
            <SummaryCard icon={MapPin} label="Unassigned" value={items.filter((item) => !item.locationId).length} detail="need a home" tone="warning" />
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 space-y-4">
              <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Your storage map</h2><p className="text-muted mt-0.5 text-sm">Select a spot to edit it or add a nested location.</p></div><span className="text-muted text-xs font-medium">{locations.length} main areas</span></div>
              <div className="relative"><Search size={16} className="text-muted-light absolute left-3.5 top-3.5" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search storage spots" className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none focus:ring-2" /></div>
              <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">{filtered.length ? filtered.map((location) => <LocationNode key={location.id} node={location} selectedId={selected?.id} onSelect={setSelectedId} counts={counts} />) : <StateCard message="No storage spots found in Turso." />}</div>
            </section>

            <aside className="space-y-6">
              <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
                <div className="flex items-center gap-3"><div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl"><MapPin size={20} /></div><div><p className="text-muted text-xs font-medium uppercase tracking-wide">Selected spot</p><h2 className="font-bold">{selected?.name ?? 'None selected'}</h2></div></div>
                <p className="text-muted mt-4 text-sm">{selected?.description || 'Add a short description to make this storage spot easier to recognize.'}</p>
                <p className="text-muted mt-3 text-sm">{selected ? `${selectedItems.length} direct items` : 'Create your first location to get started.'}</p>
                {selectedItems.length > 0 && <div className="border-border mt-4 space-y-2 border-t pt-4">{selectedItems.slice(0, 5).map((item) => <Link key={item.id} href={`/items/${item.id}`} className="hover:text-primary block truncate text-sm">{item.name}</Link>)}</div>}
                {selected && canWrite && <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={startEdit} className="border-border hover:bg-hover inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"><Pencil size={14} /> Edit</button><button type="button" onClick={() => startCreate(selected.id)} className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"><Plus size={14} /> Add nested spot</button>{canDelete && <button type="button" onClick={deleteLocation} disabled={deleting} className="bg-danger/10 text-danger hover:bg-danger/15 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60"><Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}</button>}</div>}
              </section>
              <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><h2 className="font-bold">Next step</h2><p className="text-muted mt-2 text-sm leading-relaxed">Assign a storage spot from the item editor. This view refreshes from the live API after every change.</p><Link href="/items" className="text-primary mt-4 inline-flex items-center gap-1.5 text-xs font-semibold">Review items <ArrowUpRight size={14} /></Link></section>
            </aside>
          </div>
        </>
      )}

      {editor && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="location-dialog-title"><form onSubmit={saveLocation} className="border-border bg-surface w-full max-w-lg rounded-2xl border p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="location-dialog-title" className="text-lg font-bold">{editor.mode === 'create' ? 'New location' : 'Edit location'}</h2><p className="text-muted mt-1 text-sm">Give the place a clear name and optional description.</p></div><button type="button" onClick={() => setEditor(null)} aria-label="Close location form" className="text-muted hover:bg-hover rounded-lg p-2"><X size={18} /></button></div><label className="mt-6 block text-sm font-semibold">Location name<input autoFocus required maxLength={100} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1.5 w-full rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:ring-2" placeholder="e.g. Kitchen cabinet" /></label><label className="mt-4 block text-sm font-semibold">Description<span className="text-muted mt-1 block text-xs font-normal">Optional, up to 500 characters.</span><textarea maxLength={500} rows={3} value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1.5 w-full resize-none rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:ring-2" placeholder="e.g. Upper shelf beside the refrigerator" /></label><label className="mt-4 block text-sm font-semibold">Parent location<select value={editor.parentId} onChange={(event) => setEditor({ ...editor, parentId: event.target.value })} className="border-border bg-background mt-1.5 w-full rounded-xl border px-3.5 py-3 text-sm font-normal"><option value="">No parent (top-level)</option>{parentOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditor(null)} className="border-border hover:bg-hover rounded-xl border px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving || !editor.name.trim()} className="from-primary to-accent inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : <><Check size={16} /> Save location</>}</button></div></form></div>}
    </div>
  );
}

function filterTree(nodes: LocationNode[], query: string): LocationNode[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], normalized);
    const matches = node.name.toLowerCase().includes(normalized) || (node.description ?? '').toLowerCase().includes(normalized);
    return matches || children.length ? [{ ...node, children }] : [];
  });
}

function LocationNode({ node, selectedId, onSelect, counts }: { node: LocationNode; selectedId?: string; onSelect: (id: string) => void; counts: Map<string, number> }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  return <div><div role="button" tabIndex={0} onClick={() => onSelect(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(node.id); }} className={`hover:bg-hover/60 flex cursor-pointer items-center gap-3 px-3 py-3.5 sm:px-5 ${selectedId === node.id ? 'bg-primary/5' : ''}`}><button type="button" disabled={!hasChildren} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`} onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }} className="text-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-lg disabled:cursor-default disabled:opacity-30">{hasChildren ? expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</button><div className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><MapPin size={19} /></div><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{node.name}</h3><p className="text-muted mt-1 truncate text-xs">{node.description || (node.parentId ? 'Nested location' : 'Top-level location')}</p></div><span className="text-muted-light text-xs">{counts.get(node.id) ?? 0} items</span></div>{expanded && hasChildren && <div className="border-border/70 ml-9 border-l sm:ml-[4.45rem]">{node.children?.map((child) => <LocationNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} counts={counts} />)}</div>}</div>;
}

function depth(node: InventoryTreeNode, roots: LocationNode[], current = 0): number { for (const root of roots) { if (root.id === node.id) return current; const result = depth(node, root.children ?? [], current + 1); if (result >= 0) return result; } return -1; }
function LoadingState() { return <div className="border-border bg-surface space-y-3 rounded-2xl border p-4">{Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} />)}</div>; }
function StateCard({ message, danger = false }: { message: string; danger?: boolean }) { return <div className={`${danger ? 'bg-danger/10 text-danger' : 'border-border bg-surface text-muted'} rounded-2xl border px-5 py-6 text-sm`}>{message}</div>; }
function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof Grid2X2; label: string; value: number; detail: string; tone: 'primary' | 'success' | 'warning' | 'accent' }) { const styles = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', accent: 'bg-accent/10 text-accent' }; return <div className="border-border bg-surface min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${styles[tone]}`}><Icon size={18} /></div><p className="text-muted truncate text-xs font-medium">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="text-muted-light text-xs">{detail}</p></div>; }
