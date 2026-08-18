'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Grid2X2,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { flattenInventoryTree, type InventoryTreeNode } from '@/lib/inventory-data';
import { SkeletonRow } from '@/components/Skeleton';
import { useAuthStore } from '@/stores/auth';

type ApiItem = { categoryId: string | null };
type CategoryNode = InventoryTreeNode & { parentId?: string | null; children?: CategoryNode[] };
type EditorState = { mode: 'create' | 'edit'; id: string | null; name: string; parentId: string };

export default function CategoriesPage() {
  const { membership } = useAuthStore();
  const householdId = membership?.householdId;
  const canWrite = membership?.role === 'admin' || membership?.role === 'member';
  const canDelete = membership?.role === 'admin';
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      const [categoryResponse, itemResponse] = await Promise.all([
        apiGet<{ tree: CategoryNode[] }>(`/api/households/${householdId}/categories`),
        apiGet<{ items: ApiItem[] }>(`/api/households/${householdId}/items`, {
          page: 1,
          limit: 100,
          sort: 'name',
          order: 'asc',
        }),
      ]);
      setCategories(categoryResponse.tree);
      setItems(itemResponse.items);
      setSelectedId((current) => {
        const available = flattenInventoryTree(categoryResponse.tree).some((node) => node.id === current);
        return available ? current : categoryResponse.tree[0]?.id ?? null;
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

  const flat = useMemo(() => flattenInventoryTree(categories), [categories]);
  const counts = useMemo(
    () => items.reduce((map, item) => {
      if (item.categoryId) map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
    [items],
  );
  const selected = flat.find((category) => category.id === selectedId) ?? flat[0];
  const parentOptions = useMemo(() => {
    const editing = editor?.mode === 'edit' && editor.id ? flat.find((category) => category.id === editor.id) : undefined;
    const excluded = editing ? new Set(flattenInventoryTree(editing.children ?? []).map((node) => node.id)) : new Set<string>();
    if (editing) excluded.add(editing.id);
    return flat.filter((category) => !excluded.has(category.id));
  }, [editor, flat]);

  function startCreate(parentId: string | null = null) {
    setError(null);
    setEditor({ mode: 'create', id: null, name: '', parentId: parentId ?? '' });
  }

  function startEdit() {
    if (!selected) return;
    setError(null);
    setEditor({ mode: 'edit', id: selected.id, name: selected.name, parentId: selected.parentId ?? '' });
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!householdId || !editor || !editor.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: editor.name.trim(), parent_id: editor.parentId || null };
      const response = editor.mode === 'create'
        ? await apiPost<{ category: CategoryNode }>(`/api/households/${householdId}/categories`, payload)
        : await apiPatch<{ category: CategoryNode }>(`/api/households/${householdId}/categories/${editor.id}`, payload);
      await loadData();
      setSelectedId(response.category.id);
      setEditor(null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!householdId || !selected || !canDelete) return;
    const childCount = flattenInventoryTree(selected.children ?? []).length;
    const warning = childCount > 0
      ? `Delete ${selected.name}? Its ${childCount} nested categor${childCount === 1 ? 'y' : 'ies'} will also be removed, and assigned items will become uncategorized.`
      : `Delete ${selected.name}? Items assigned to it will become uncategorized.`;
    if (!window.confirm(warning)) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/households/${householdId}/categories/${selected.id}`);
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
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold"><SparklesIcon /><span>Our Home</span><span className="text-muted-light">/</span><span className="text-muted font-normal">Categories</span></div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Live category map</h1>
          <p className="text-muted mt-1">Categories and item assignments come from Turso.</p>
        </div>
        {canWrite ? <button type="button" onClick={() => startCreate()} className="from-primary to-accent inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:self-auto"><Plus size={17} /> New category</button> : <span className="bg-hover text-muted inline-flex items-center gap-2 self-start rounded-xl px-3.5 py-2.5 text-sm font-semibold sm:self-auto">View only</span>}
      </header>

      {error && <StateCard message={error} danger />}
      {loading ? <LoadingState /> : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard icon={FolderTree} label="Categories" value={flat.length} detail="in Turso" tone="accent" />
            <SummaryCard icon={Package} label="Organized items" value={items.filter((item) => item.categoryId).length} detail="with a category" tone="primary" />
            <SummaryCard icon={Grid2X2} label="Top-level groups" value={categories.length} detail="root categories" tone="success" />
            <SummaryCard icon={Tag} label="Unassigned" value={items.filter((item) => !item.categoryId).length} detail="need a category" tone="warning" />
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 space-y-4">
              <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Category structure</h2><p className="text-muted mt-0.5 text-sm">Select a category to edit it or add a nested group.</p></div><span className="text-muted text-xs font-medium">{categories.length} groups</span></div>
              <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
                {categories.length ? categories.map((category) => <CategoryNode key={category.id} node={category} selectedId={selected?.id} onSelect={setSelectedId} counts={counts} />) : <StateCard message="No categories are stored for this household yet." />}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
                <div className="flex items-center gap-3"><div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl"><Tag size={20} /></div><div><p className="text-muted text-xs font-medium uppercase tracking-wide">Selected category</p><h2 className="font-bold">{selected?.name ?? 'None selected'}</h2></div></div>
                <p className="text-muted bg-background mt-5 rounded-xl p-3 text-sm">Categories group items so the inventory is easier to search and maintain.</p>
                <p className="text-muted mt-4 text-sm">{selected ? `${counts.get(selected.id) ?? 0} direct items` : 'Create your first category to get started.'}</p>
                {selected && canWrite && <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={startEdit} className="border-border hover:bg-hover inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"><Pencil size={14} /> Edit</button><button type="button" onClick={() => startCreate(selected.id)} className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"><Plus size={14} /> Add subcategory</button>{canDelete && <button type="button" onClick={deleteCategory} disabled={deleting} className="bg-danger/10 text-danger hover:bg-danger/15 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60"><Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}</button>}</div>}
              </section>
              <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><h2 className="font-bold">Next step</h2><p className="text-muted mt-2 text-sm leading-relaxed">Assign categories from the item editor. The list refreshes from the live API after every change.</p><Link href="/items" className="text-primary mt-4 inline-flex items-center gap-1.5 text-xs font-semibold">Review items <ArrowUpRight size={14} /></Link></section>
            </aside>
          </div>
        </>
      )}

      {editor && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title"><form onSubmit={saveCategory} className="border-border bg-surface w-full max-w-lg rounded-2xl border p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="category-dialog-title" className="text-lg font-bold">{editor.mode === 'create' ? 'New category' : 'Edit category'}</h2><p className="text-muted mt-1 text-sm">Keep names short so they are easy to scan in filters and item forms.</p></div><button type="button" onClick={() => setEditor(null)} aria-label="Close category form" className="text-muted hover:bg-hover rounded-lg p-2"><X size={18} /></button></div><label className="mt-6 block text-sm font-semibold">Category name<input autoFocus required maxLength={100} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1.5 w-full rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:ring-2" placeholder="e.g. Electronics" /></label><label className="mt-4 block text-sm font-semibold">Parent category<span className="text-muted mt-1 block text-xs font-normal">Optional — use this to create a nested group.</span><select value={editor.parentId} onChange={(event) => setEditor({ ...editor, parentId: event.target.value })} className="border-border bg-background mt-1.5 w-full rounded-xl border px-3.5 py-3 text-sm font-normal"><option value="">No parent (top-level)</option>{parentOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditor(null)} className="border-border hover:bg-hover rounded-xl border px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving || !editor.name.trim()} className="from-primary to-accent inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : <><Check size={16} /> Save category</>}</button></div></form></div>}
    </div>
  );
}

function CategoryNode({ node, selectedId, onSelect, counts }: { node: CategoryNode; selectedId?: string; onSelect: (id: string) => void; counts: Map<string, number> }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  return <div><div role="button" tabIndex={0} onClick={() => onSelect(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(node.id); }} className={`hover:bg-hover/60 flex cursor-pointer items-center gap-3 px-3 py-3.5 sm:px-5 ${selectedId === node.id ? 'bg-primary/5' : ''}`}><button type="button" disabled={!hasChildren} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`} onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }} className="text-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-lg disabled:cursor-default disabled:opacity-30">{hasChildren ? expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</button><div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Tag size={19} /></div><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{node.name}</h3><p className="text-muted mt-1 truncate text-xs">{node.parentId ? 'Nested category' : 'Top-level category'}</p></div><span className="text-muted-light text-xs">{counts.get(node.id) ?? 0} items</span></div>{expanded && hasChildren && <div className="border-border/70 ml-9 border-l sm:ml-[4.45rem]">{node.children?.map((child) => <CategoryNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} counts={counts} />)}</div>}</div>;
}

function LoadingState() { return <div className="border-border bg-surface space-y-3 rounded-2xl border p-4">{Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} />)}</div>; }
function StateCard({ message, danger = false }: { message: string; danger?: boolean }) { return <div className={`${danger ? 'bg-danger/10 text-danger' : 'border-border bg-surface text-muted'} rounded-2xl border px-5 py-6 text-sm`}>{message}</div>; }
function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof FolderTree; label: string; value: number; detail: string; tone: 'primary' | 'success' | 'warning' | 'accent' }) { const styles = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', accent: 'bg-accent/10 text-accent' }; return <div className="border-border bg-surface min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${styles[tone]}`}><Icon size={18} /></div><p className="text-muted truncate text-xs font-medium">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="text-muted-light text-xs">{detail}</p></div>; }
function SparklesIcon() { return <span aria-hidden="true">✦</span>; }
