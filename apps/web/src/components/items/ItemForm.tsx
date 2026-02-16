'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useItemsStore, type Item } from '@/stores/items';
import { useAuthStore } from '@/stores/auth';
import { ITEM_STATUSES, STATUS_CONFIG } from '@leonorevault/shared';
type ItemStatus = (typeof ITEM_STATUSES)[number];
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ItemFormProps {
  /** Existing item to edit. If undefined, it's a create form. */
  item?: Item;
}

/**
 * Create/Edit item form.
 * Uses controlled components with Zod-validated API submission.
 */
export default function ItemForm({ item }: ItemFormProps) {
  const router = useRouter();
  const { membership } = useAuthStore();
  const { createItem, updateItem } = useItemsStore();
  const householdId = membership?.householdId;

  const isEdit = !!item;

  const [formData, setFormData] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    quantity: item?.quantity ?? 1,
    status: item?.status ?? 'stored',
    tags: item?.tags?.join(', ') ?? '',
    category_id: item?.categoryId ?? '',
    location_id: item?.locationId ?? '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    setSubmitting(true);
    setError(null);

    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        quantity: Number(formData.quantity),
        tags: tags.length > 0 ? tags : undefined,
        status: formData.status as ItemStatus,
        category_id: formData.category_id || undefined,
        location_id: formData.location_id || undefined,
      };

      if (isEdit && item) {
        await updateItem(householdId, item.id, payload);
        router.push(`/items/${item.id}`);
      } else {
        const newItem = await createItem(householdId, payload);
        router.push(`/items/${newItem.id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={isEdit ? `/items/${item!.id}` : '/items'}
          className="text-muted hover:text-foreground hover:bg-hover rounded-xl p-2 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Item' : 'New Item'}</h1>
          <p className="text-muted text-sm">
            {isEdit ? 'Update item details' : 'Add a new item to your inventory'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-border bg-surface space-y-5 rounded-2xl border p-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Passport, MacBook Pro"
              className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description..."
              rows={3}
              className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full resize-none rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
              maxLength={2000}
            />
          </div>

          {/* Quantity + Status Row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                value={formData.quantity}
                onChange={handleChange}
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-1.5 block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
              >
                {ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s as ItemStatus].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              value={formData.tags}
              onChange={handleChange}
              placeholder="Comma-separated, e.g.: electronics, charger, work"
              className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
            />
            <p className="text-muted-light mt-1 text-xs">Separate tags with commas</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={isEdit ? `/items/${item!.id}` : '/items'}
            className="border-border text-foreground hover:bg-hover rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !formData.name.trim()}
            className="from-primary to-accent flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEdit ? 'Update Item' : 'Create Item'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
