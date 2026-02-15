'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useItemsStore } from '@/stores/items';
import StatusBadge from '@/components/StatusBadge';
import AttachmentPanel from '@/components/items/AttachmentPanel';
import { STATUS_TRANSITIONS, STATUS_CONFIG, type ItemStatus } from '@leonorevault/shared';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Package,
  MapPin,
  Tag,
  Calendar,
  User,
  Loader2,
  RotateCcw,
} from 'lucide-react';

/**
 * Item Detail page — shows full item info with action buttons.
 */
export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;
  const { membership } = useAuthStore();
  const {
    selectedItem: item,
    loading,
    error,
    fetchItem,
    updateStatus,
    deleteItem,
    clearSelected,
  } = useItemsStore();
  const householdId = membership?.householdId;

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [borrowedBy, setBorrowedBy] = useState('');

  useEffect(() => {
    if (householdId && itemId) {
      fetchItem(householdId, itemId);
    }
    return () => clearSelected();
  }, [householdId, itemId, fetchItem, clearSelected]);

  const handleStatusChange = async (newStatus: ItemStatus) => {
    if (!householdId || !item) return;
    // 'borrowed' requires a borrowed_by user ID
    if (newStatus === 'borrowed' && !borrowedBy.trim()) {
      return; // button is disabled, but guard anyway
    }
    setActionLoading(true);
    try {
      const payload: { status: ItemStatus; borrowed_by?: string } = { status: newStatus };
      if (newStatus === 'borrowed') {
        payload.borrowed_by = borrowedBy.trim();
      }
      await updateStatus(householdId, item.id, payload);
      setStatusModalOpen(false);
      setBorrowedBy('');
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!householdId || !item) return;
    setActionLoading(true);
    try {
      await deleteItem(householdId, item.id);
      router.push('/items');
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
        <Package size={48} className="text-muted-light mb-4" />
        <h2 className="mb-2 text-xl font-bold">Item Not Found</h2>
        <p className="text-muted mb-6">{error || 'The item you are looking for does not exist.'}</p>
        <Link
          href="/items"
          className="from-primary to-accent rounded-xl bg-gradient-to-r px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to Items
        </Link>
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[item.status as ItemStatus] || [];
  const isEditable = membership?.role === 'admin' || membership?.role === 'member';

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-muted flex items-center gap-2 text-sm">
        <Link href="/items" className="hover:text-foreground transition-colors">
          Items
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{item.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/items"
            className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold md:text-3xl">{item.name}</h1>
              <StatusBadge status={item.status as ItemStatus} size="md" />
            </div>
            {item.description && <p className="text-muted max-w-2xl">{item.description}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditable && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusModalOpen(!statusModalOpen)}
              className="border-border hover:bg-hover flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
            >
              <RotateCcw size={16} />
              Status
            </button>
            <Link
              href={`/items/${item.id}/edit`}
              className="border-border hover:bg-hover flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
            >
              <Edit3 size={16} />
              Edit
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="border-danger/30 text-danger hover:bg-danger/10 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Status Change Panel */}
      {statusModalOpen && allowedTransitions.length > 0 && (
        <div className="border-border bg-surface animate-in fade-in slide-in-from-top-2 rounded-2xl border p-5">
          <p className="mb-3 text-sm font-medium">Change status to:</p>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((s) => (
              <button
                key={s}
                onClick={() => (s === 'borrowed' ? null : handleStatusChange(s))}
                disabled={actionLoading || s === 'borrowed'}
                className={`border-border hover:border-primary/30 hover:bg-primary/5 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                  s === 'borrowed' ? 'opacity-70' : ''
                }`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Borrowed sub-form */}
          {allowedTransitions.includes('borrowed' as ItemStatus) && (
            <div className="border-border mt-4 space-y-3 border-t pt-4">
              <p className="text-muted text-sm">
                To mark as borrowed, enter the borrower&apos;s user ID:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={borrowedBy}
                  onChange={(e) => setBorrowedBy(e.target.value)}
                  placeholder="Borrower user ID (UUID)"
                  className="border-border bg-background focus:border-primary focus:ring-primary/20 flex-1 rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
                />
                <button
                  onClick={() => handleStatusChange('borrowed' as ItemStatus)}
                  disabled={actionLoading || !borrowedBy.trim()}
                  className="from-primary to-accent rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="bg-danger/5 border-danger/20 rounded-2xl border p-5">
          <p className="text-danger text-sm font-medium">
            Are you sure you want to delete this item?
          </p>
          <p className="text-muted mt-1 text-sm">This action can be undone by an admin.</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-danger flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="border-border hover:bg-hover rounded-xl border px-4 py-2 text-sm font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Detail Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Info Card */}
        <div className="border-border bg-surface space-y-4 rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Details</h2>

          <DetailRow icon={<Package size={16} />} label="Quantity" value={String(item.quantity)} />
          <DetailRow
            icon={<Tag size={16} />}
            label="Category"
            value={item.categoryId ? 'Assigned' : 'None'}
          />
          <DetailRow
            icon={<MapPin size={16} />}
            label="Location"
            value={item.locationId ? 'Assigned' : 'None'}
          />
          <DetailRow icon={<User size={16} />} label="Created By" value={item.createdBy} />
        </div>

        {/* Timestamps Card */}
        <div className="border-border bg-surface space-y-4 rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Timeline</h2>

          <DetailRow
            icon={<Calendar size={16} />}
            label="Created"
            value={new Date(item.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          />
          <DetailRow
            icon={<Calendar size={16} />}
            label="Updated"
            value={new Date(item.updatedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          />
          {item.borrowedBy && (
            <DetailRow icon={<User size={16} />} label="Borrowed By" value={item.borrowedBy} />
          )}
          {item.borrowDueDate && (
            <DetailRow
              icon={<Calendar size={16} />}
              label="Due Date"
              value={new Date(item.borrowDueDate).toLocaleDateString('en-US', {
                dateStyle: 'medium',
              })}
            />
          )}
        </div>
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="border-border bg-surface rounded-2xl border p-6">
          <h2 className="mb-3 text-lg font-semibold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {householdId && (
        <AttachmentPanel householdId={householdId} itemId={item.id} editable={isEditable} />
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted flex items-center gap-2 text-sm">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
