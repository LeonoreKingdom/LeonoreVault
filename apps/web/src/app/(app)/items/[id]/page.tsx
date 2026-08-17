'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  MapPin,
  QrCode,
  RotateCcw,
  Tag,
  UserRound,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { flattenInventoryTree, formatStatus, labelFor, statusClass, type InventoryTreeNode } from '@/lib/inventory-data';
import { useItemsStore } from '@/stores/items';
import { useAuthStore } from '@/stores/auth';

type TreeResponse = { tree: InventoryTreeNode[] };
type HouseholdResponse = { members: Array<{ userId: string; user: { displayName: string | null; email: string } }> };
type Attachment = { id: string; fileName: string; mimeType: string; webViewLink: string | null; createdAt: string };
type Activity = { id: string; action: string; details: Record<string, unknown> | null; createdAt: string; user?: { displayName: string | null } };

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = String(params.id);
  const { membership } = useAuthStore();
  const { selectedItem: item, loading, error, fetchItem, updateStatus } = useItemsStore();
  const [categories, setCategories] = useState<InventoryTreeNode[]>([]);
  const [locations, setLocations] = useState<InventoryTreeNode[]>([]);
  const [members, setMembers] = useState<HouseholdResponse['members']>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [borrowerId, setBorrowerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const householdId = membership?.householdId;
  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    void Promise.all([
      fetchItem(householdId, itemId),
      apiGet<TreeResponse>(`/api/households/${householdId}/categories`),
      apiGet<TreeResponse>(`/api/households/${householdId}/locations`),
      apiGet<HouseholdResponse>(`/api/households/${householdId}`),
      apiGet<Attachment[]>(`/api/households/${householdId}/items/${itemId}/attachments`),
      apiGet<{ activities: Activity[] }>(`/api/households/${householdId}/items/${itemId}/activities`),
    ])
      .then(([, categoryResponse, locationResponse, householdResponse, attachmentResponse, activityResponse]) => {
        if (cancelled) return;
        setCategories(categoryResponse.tree);
        setLocations(locationResponse.tree);
        setMembers(householdResponse.members);
        setAttachments(attachmentResponse);
        setActivities(activityResponse.activities);
      })
      .catch((requestError) => {
        if (!cancelled) setActionError((requestError as Error).message);
      });
    return () => { cancelled = true; };
  }, [fetchItem, householdId, itemId]);

  const categoryMap = useMemo(() => new Map(flattenInventoryTree(categories).map((node) => [node.id, node])), [categories]);
  const locationMap = useMemo(() => new Map(flattenInventoryTree(locations).map((node) => [node.id, node])), [locations]);

  async function checkout() {
    if (!householdId || !item || !borrowerId) return;
    setBusy(true); setActionError(null);
    try {
      await updateStatus(householdId, item.id, { status: 'borrowed', borrowed_by: borrowerId, borrow_due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null });
      await fetchItem(householdId, item.id);
    } catch (requestError) { setActionError((requestError as Error).message); } finally { setBusy(false); }
  }

  async function returnItem() {
    if (!householdId || !item) return;
    setBusy(true); setActionError(null);
    try {
      await apiPost(`/api/households/${householdId}/items/${item.id}/return`, { note: null });
      await fetchItem(householdId, item.id);
      const activityResponse = await apiGet<{ activities: Activity[] }>(`/api/households/${householdId}/items/${item.id}/activities`);
      setActivities(activityResponse.activities);
    } catch (requestError) { setActionError((requestError as Error).message); } finally { setBusy(false); }
  }

  if (!householdId) return <StateCard message="No household membership is available for this account." />;
  if (loading && !item) return <LoadingState />;
  if (error || actionError) return <StateCard message={error ?? actionError ?? 'Failed to load item.'} danger />;
  if (!item) return <StateCard message="Item not found in the Turso inventory." />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4"><Link href="/items" aria-label="Back to items" className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2"><ArrowLeft size={20} /></Link><div><div className="text-muted mb-2 flex items-center gap-2 text-sm"><Link href="/items" className="hover:text-foreground">Items</Link><span>/</span><span>{item.name}</span></div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">{item.name}</h1><p className="text-muted mt-1">Live item metadata from Turso.</p></div></div>
        <div className="flex gap-2"><Link href={`/items/${item.id}/edit`} className="border-border hover:bg-hover inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"><Edit3 size={16} /> Edit</Link><Link href={`/items/labels?item=${item.id}`} className="from-primary to-accent inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white"><QrCode size={16} /> Label</Link></div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-muted text-xs font-semibold uppercase tracking-wide">Current status</p><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClass(item.status)}`}>{formatStatus(item.status)}</span></div><div className="text-muted text-right text-sm"><p>Quantity</p><p className="text-foreground mt-1 text-xl font-bold">{item.quantity}</p></div></div><p className="text-muted mt-5 leading-relaxed">{item.description || 'No description has been added for this item.'}</p><div className="border-border mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2"><InfoRow icon={<Tag size={16} />} label="Category" value={labelFor(categoryMap, item.categoryId)} /><InfoRow icon={<MapPin size={16} />} label="Location" value={labelFor(locationMap, item.locationId)} /><InfoRow icon={<CalendarDays size={16} />} label="Updated" value={new Date(item.updatedAt).toLocaleString()} /><InfoRow icon={<UserRound size={16} />} label="Created by" value={item.createdBy} /></div>{item.tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="bg-hover text-muted rounded-full px-2.5 py-1 text-xs">{tag}</span>)}</div>}</section>

          {item.status === 'borrowed' ? <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><h2 className="font-bold">Active checkout</h2><p className="text-muted mt-1 text-sm">Borrower: {members.find((member) => member.userId === item.borrowedBy)?.user.displayName || item.borrowedBy || 'Unknown member'}</p><p className="text-muted mt-1 text-sm">Due: {item.borrowDueDate ? new Date(item.borrowDueDate).toLocaleDateString() : 'No due date'}</p><button type="button" onClick={returnItem} disabled={busy} className="from-primary to-accent mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Mark returned</button></section> : <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><h2 className="font-bold">Check out this item</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Borrower<select value={borrowerId} onChange={(event) => setBorrowerId(event.target.value)} className="border-border bg-background mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal"><option value="">Select a household member</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.displayName || member.user.email}</option>)}</select></label><label className="text-sm font-semibold">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="border-border bg-background mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" /></label></div><button type="button" onClick={checkout} disabled={busy || !borrowerId} className="from-primary to-accent mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Check out item</button></section>}

          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Activity</h2><p className="text-muted mt-1 text-sm">Recorded in Turso.</p></div><FileText size={18} className="text-muted-light" /></div>{activities.length === 0 ? <p className="text-muted mt-5 text-sm">No activity recorded yet.</p> : <div className="mt-5 space-y-4">{activities.map((activity) => <div key={activity.id} className="border-border flex gap-3 border-l-2 pl-4"><div><p className="text-sm font-semibold">{activity.action.replaceAll('_', ' ')}</p><p className="text-muted mt-1 text-xs">{activity.user?.displayName || activity.user?.displayName === '' ? activity.user.displayName : 'Household member'} · {new Date(activity.createdAt).toLocaleString()}</p></div></div>)}</div>}</section>
        </div>

        <aside className="space-y-6"><section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><div className="flex items-center gap-3"><div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl"><FileText size={18} /></div><div><h2 className="font-bold">Attachments</h2><p className="text-muted text-xs">Stored and served through Cloudflare R2.</p></div></div>{attachments.length === 0 ? <p className="text-muted mt-5 text-sm">No attachments linked to this item.</p> : <div className="mt-5 space-y-2">{attachments.map((attachment) => <a key={attachment.id} href={attachment.webViewLink || undefined} target="_blank" rel="noreferrer" className="border-border hover:bg-hover flex items-center gap-3 rounded-xl border p-3 text-sm"><FileText size={16} className="text-primary" /><span className="min-w-0 flex-1 truncate">{attachment.fileName}</span><span className="text-muted-light text-xs">Open</span></a>)}</div>}</section><section className="border-border bg-surface rounded-2xl border p-5 shadow-sm"><h2 className="font-bold">Record identity</h2><p className="text-muted mt-3 break-all text-xs">{item.id}</p><p className="text-muted mt-2 text-xs">QR token: {item.qrToken ? 'available' : 'not assigned'}</p></section></aside>
      </section>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-start gap-2 text-sm"><span className="text-muted mt-0.5">{icon}</span><div><p className="text-muted text-xs">{label}</p><p className="mt-0.5 truncate font-semibold">{value}</p></div></div>; }
function LoadingState() { return <div className="flex justify-center py-20"><Loader2 size={30} className="text-primary animate-spin" /></div>; }
function StateCard({ message, danger = false }: { message: string; danger?: boolean }) { return <div className={`${danger ? 'bg-danger/10 text-danger' : 'border-border bg-surface text-muted'} rounded-2xl border px-5 py-6 text-sm`}>{message}</div>; }
