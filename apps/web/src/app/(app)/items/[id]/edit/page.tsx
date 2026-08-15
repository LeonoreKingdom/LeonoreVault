'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, MapPin, Package, Save, Tag } from 'lucide-react';

type EditItemForm = {
  name: string;
  description: string;
  category: string;
  location: string;
  quantity: string;
  status: 'Stored' | 'Checked out' | 'Needs a home';
  tags: string;
};

const baseForm: EditItemForm = {
  name: 'Mirrorless camera',
  description: 'Compact camera kit for family trips, day walks, and weekend projects.',
  category: 'Electronics',
  location: 'Media cabinet',
  quantity: '1',
  status: 'Stored',
  tags: 'travel, fragile',
};

const mockItemValues: Record<string, Partial<EditItemForm>> = {
  'item-drill': {
    name: 'Cordless drill',
    description: '18V drill for small household repairs and weekend maintenance.',
    category: 'Tools',
    location: 'Tool cabinet',
    status: 'Checked out',
    tags: 'maintenance',
  },
  'item-linens': {
    name: 'Guest bed linens',
    description: 'Clean spare sheets and pillowcases for the guest room.',
    category: 'Bedroom',
    location: 'Wardrobe',
    quantity: '2',
    tags: 'seasonal',
  },
  'item-birthday': {
    name: 'Birthday decorations',
    description: 'Reusable banners, candles, and table decorations for celebrations.',
    category: 'Events',
    location: 'Unassigned',
    status: 'Needs a home',
    tags: 'party',
  },
};

const categories = [
  'Electronics',
  'Kitchen',
  'Tools',
  'Bedroom',
  'Entertainment',
  'Events',
  'Documents',
];
const locations = [
  'Media cabinet',
  'Pantry shelves',
  'Tool cabinet',
  'Wardrobe',
  'Bookcase',
  'Unassigned',
];
const inputClass =
  'border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2';

export default function EditItemPage() {
  const params = useParams();
  const itemId = String(params.id);
  const [formData, setFormData] = useState<EditItemForm>({
    ...baseForm,
    ...mockItemValues[itemId],
  });
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof EditItemForm>(field: K, value: EditItemForm[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.name.trim()) return;
    setSaved(true);
  }

  const tags = formData.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3 sm:gap-4">
        <Link
          href={`/items/${itemId}`}
          aria-label="Back to item"
          className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="text-muted mb-2 flex items-center gap-2 text-sm">
            <Link href="/items" className="hover:text-foreground transition-colors">
              Items
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit item</h1>
          <p className="text-muted mt-1">Keep the details clear for everyone at home.</p>
        </div>
      </header>

      {saved && (
        <div className="bg-success/10 text-success flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Changes saved for {formData.name}.</p>
            <p className="mt-0.5 opacity-80">
              This is a frontend preview. Persistence will be connected in the data layer.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="border-border bg-surface space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Item basics</h2>
              <p className="text-muted mt-0.5 text-sm">Update the details people use to find it.</p>
            </div>

            <Field label="Item name" htmlFor="edit-name">
              <input
                id="edit-name"
                type="text"
                required
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={100}
                className={inputClass}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="edit-description"
              hint="Keep it short enough to scan quickly."
            >
              <textarea
                id="edit-description"
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
                rows={4}
                maxLength={500}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category" htmlFor="edit-category">
                <select
                  id="edit-category"
                  value={formData.category}
                  onChange={(event) => updateField('category', event.target.value)}
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity" htmlFor="edit-quantity">
                <input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  max="999"
                  value={formData.quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="border-border bg-surface space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Organization</h2>
              <p className="text-muted mt-0.5 text-sm">
                Keep its place and current state up to date.
              </p>
            </div>

            <Field label="Storage spot" htmlFor="edit-location">
              <select
                id="edit-location"
                value={formData.location}
                onChange={(event) => updateField('location', event.target.value)}
                className={inputClass}
              >
                {locations.map((location) => (
                  <option key={location}>{location}</option>
                ))}
              </select>
            </Field>

            <Field label="Status" htmlFor="edit-status">
              <select
                id="edit-status"
                value={formData.status}
                onChange={(event) =>
                  updateField('status', event.target.value as EditItemForm['status'])
                }
                className={inputClass}
              >
                <option>Stored</option>
                <option>Checked out</option>
                <option>Needs a home</option>
              </select>
            </Field>

            <Field label="Tags" htmlFor="edit-tags" hint="Separate tags with commas.">
              <input
                id="edit-tags"
                type="text"
                value={formData.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                className={inputClass}
              />
            </Field>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/items/${itemId}`}
              className="border-border hover:bg-hover rounded-xl border px-5 py-2.5 text-center text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="from-primary to-accent inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              Save changes
            </button>
          </div>
        </form>

        <aside className="space-y-6" aria-label="Edit item preview">
          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Current summary</h2>
                <p className="text-muted mt-0.5 text-sm">A quick check before saving.</p>
              </div>
              <Package size={19} className="text-primary" />
            </div>
            <div className="space-y-4">
              <SummaryRow
                icon={<Package size={15} />}
                label="Name"
                value={formData.name || 'Unnamed item'}
              />
              <SummaryRow icon={<MapPin size={15} />} label="Location" value={formData.location} />
              <SummaryRow
                icon={<Tag size={15} />}
                label="Quantity"
                value={`${formData.quantity} units`}
              />
            </div>
            {tags.length > 0 && (
              <div className="border-border mt-5 flex flex-wrap gap-1.5 border-t pt-4">
                {tags.map((tag) => (
                  <span key={tag} className="bg-hover text-muted rounded-full px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
            <h2 className="font-bold">Editing checklist</h2>
            <ul className="text-muted mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                Use a name your household will recognize.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                Keep the location current after moving it.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                Add tags only when they help a future search.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-muted-light mt-1 text-xs">{hint}</p>}
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="truncate text-right font-semibold">{value}</span>
    </div>
  );
}
