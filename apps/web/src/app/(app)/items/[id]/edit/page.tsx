'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Package, Save, Tag } from 'lucide-react';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { formatStatus, type InventoryTreeNode } from '@/lib/inventory-data';
import { type Item, useItemsStore } from '@/stores/items';
import { useAuthStore } from '@/stores/auth';

type EditItemForm = { name: string; description: string; categoryId: string; locationId: string; quantity: string; status: Item['status']; tags: string };
type TreeResponse = { tree: InventoryTreeNode[] };
const inputClass = 'border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2';

export default function EditItemPage() {
  const params = useParams();
  const itemId = String(params.id);
  const { membership } = useAuthStore();
  const { selectedItem, loading, error, fetchItem, updateItem, updateStatus } = useItemsStore();
  const [categories, setCategories] = useState<InventoryTreeNode[]>([]);
  const [locations, setLocations] = useState<InventoryTreeNode[]>([]);
  const [formData, setFormData] = useState<EditItemForm | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.householdId) return;
    void Promise.all([
      fetchItem(membership.householdId, itemId),
      apiGet<TreeResponse>(`/api/households/${membership.householdId}/categories`),
      apiGet<TreeResponse>(`/api/households/${membership.householdId}/locations`),
    ]).then(([, categoryResponse, locationResponse]) => {
      setCategories(categoryResponse.tree);
      setLocations(locationResponse.tree);
    }).catch((requestError) => setSaveError((requestError as Error).message));
  }, [fetchItem, itemId, membership?.householdId]);

  useEffect(() => {
    if (!selectedItem) return;
    const nextForm: EditItemForm = { name: selectedItem.name, description: selectedItem.description ?? '', categoryId: selectedItem.categoryId ?? '', locationId: selectedItem.locationId ?? '', quantity: String(selectedItem.quantity), status: selectedItem.status, tags: selectedItem.tags.join(', ') };
    queueMicrotask(() => setFormData(nextForm));
  }, [selectedItem]);

  const updateField = <K extends keyof EditItemForm>(field: K, value: EditItemForm[K]) => { setFormData((current) => current ? { ...current, [field]: value } : current); setSaved(false); };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!membership?.householdId || !selectedItem || !formData || !formData.name.trim()) return;
    setSaveError(null); setSaved(false);
    try {
      await updateItem(membership.householdId, itemId, { name: formData.name.trim(), description: formData.description.trim() || null, category_id: formData.categoryId || null, location_id: formData.locationId || null, quantity: Number(formData.quantity), tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean) });
      if (formData.status !== selectedItem.status) {
        await updateStatus(membership.householdId, itemId, { status: formData.status, borrowed_by: formData.status === 'borrowed' ? selectedItem.borrowedBy : null, borrow_due_date: formData.status === 'borrowed' ? selectedItem.borrowDueDate : null });
      }
      await fetchItem(membership.householdId, itemId);
      setSaved(true);
    } catch (requestError) { setSaveError((requestError as Error).message); }
  }

  if (!membership?.householdId) return <StateCard message="No household membership is available for this account." />;
  if (loading && !formData) return <LoadingState />;
  if (error || saveError) return <StateCard message={error ?? saveError ?? 'Failed to load item.'} danger />;
  if (!selectedItem || !formData) return <StateCard message="Item not found in the Turso inventory." />;

  return <div className="space-y-8"><header className="flex items-start gap-3 sm:gap-4"><Link href={`/items/${itemId}`} aria-label="Back to item" className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2"><ArrowLeft size={20} /></Link><div><div className="text-muted mb-2 flex items-center gap-2 text-sm"><Link href="/items" className="hover:text-foreground">Items</Link><span>/</span><span>Edit</span></div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit item</h1><p className="text-muted mt-1">Changes are saved to Turso through the live API.</p></div></header>{saved && <div className="bg-success/10 text-success flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm"><CheckCircle2 size={19} /><p className="font-semibold">Changes saved for {formData.name}.</p></div>}<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><form onSubmit={handleSubmit} className="space-y-5"><section className="border-border bg-surface space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-bold">Item basics</h2><p className="text-muted mt-0.5 text-sm">Update the fields stored in the inventory record.</p></div><Field label="Item name" htmlFor="edit-name"><input id="edit-name" required value={formData.name} onChange={(event) => updateField('name', event.target.value)} maxLength={200} className={inputClass} /></Field><Field label="Description" htmlFor="edit-description"><textarea id="edit-description" value={formData.description} onChange={(event) => updateField('description', event.target.value)} rows={4} maxLength={2000} className={`${inputClass} resize-none`} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Category" htmlFor="edit-category"><select id="edit-category" value={formData.categoryId} onChange={(event) => updateField('categoryId', event.target.value)} className={inputClass}><option value="">Unassigned</option>{flatten(categories).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Quantity" htmlFor="edit-quantity"><input id="edit-quantity" type="number" min="1" max="999" value={formData.quantity} onChange={(event) => updateField('quantity', event.target.value)} className={inputClass} /></Field></div></section><section className="border-border bg-surface space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-bold">Organization</h2><p className="text-muted mt-0.5 text-sm">Keep its place and state current.</p></div><Field label="Storage spot" htmlFor="edit-location"><select id="edit-location" value={formData.locationId} onChange={(event) => updateField('locationId', event.target.value)} className={inputClass}><option value="">Unassigned</option>{flatten(locations).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field><Field label="Status" htmlFor="edit-status"><select id="edit-status" value={formData.status} onChange={(event) => updateField('status', event.target.value as Item['status'])} className={inputClass}><option value="stored">Stored</option><option value="borrowed">Checked out</option><option value="lost">Lost</option><option value="in_lost_found">Needs review</option></select></Field><Field label="Tags" htmlFor="edit-tags" hint="Separate tags with commas."><input id="edit-tags" value={formData.tags} onChange={(event) => updateField('tags', event.target.value)} className={inputClass} /></Field></section><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href={`/items/${itemId}`} className="border-border hover:bg-hover rounded-xl border px-5 py-2.5 text-center text-sm font-semibold">Cancel</Link><button type="submit" disabled={loading || !formData.name.trim()} className="from-primary to-accent inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={17} /> Save changes</button></div></form><aside className="space-y-6"><section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-bold">Current summary</h2><p className="text-muted mt-0.5 text-sm">Live record preview.</p></div><Package size={19} className="text-primary" /></div><div className="space-y-4"><SummaryRow icon={<Package size={15} />} label="Name" value={formData.name || 'Unnamed item'} /><SummaryRow icon={<MapPin size={15} />} label="Status" value={formatStatus(formData.status)} /><SummaryRow icon={<Tag size={15} />} label="Quantity" value={`${formData.quantity} units`} /></div></section><p className="text-muted text-xs">Changing an active checkout requires a valid borrower and follows the API state transition rules.</p></aside></div></div>;
}

function flatten(nodes: InventoryTreeNode[]): InventoryTreeNode[] { return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]); }
function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) { return <div><label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">{label}</label>{children}{hint && <p className="text-muted-light mt-1 text-xs">{hint}</p>}</div>; }
function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted flex items-center gap-2">{icon}{label}</span><span className="truncate text-right font-semibold">{value}</span></div>; }
function LoadingState() { return <div className="flex justify-center py-20"><Loader2 size={30} className="text-primary animate-spin" /></div>; }
function StateCard({ message, danger = false }: { message: string; danger?: boolean }) { return <div className={`${danger ? 'bg-danger/10 text-danger' : 'border-border bg-surface text-muted'} rounded-2xl border px-5 py-6 text-sm`}>{message}</div>; }
