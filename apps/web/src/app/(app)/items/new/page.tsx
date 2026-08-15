'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Package, Save, Sparkles, Tag } from 'lucide-react';

type NewItemForm = {
  name: string;
  description: string;
  category: string;
  location: string;
  quantity: string;
  status: 'Stored' | 'Checked out' | 'Needs a home';
  tags: string;
};

const initialForm: NewItemForm = {
  name: '',
  description: '',
  category: 'Electronics',
  location: 'Media cabinet',
  quantity: '1',
  status: 'Stored',
  tags: '',
};

const categories = ['Electronics', 'Kitchen', 'Tools', 'Bedroom', 'Entertainment', 'Documents'];
const locations = ['Media cabinet', 'Pantry shelves', 'Tool cabinet', 'Wardrobe', 'Bookcase'];
const inputClass =
  'border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2';

export default function NewItemPage() {
  const [formData, setFormData] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const updateField = <K extends keyof NewItemForm>(field: K, value: NewItemForm[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitted(true);
  }

  function resetForm() {
    setFormData(initialForm);
    setSubmitted(false);
  }

  const tags = formData.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3 sm:gap-4">
        <Link
          href="/items"
          aria-label="Back to items"
          className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} />
            <span>Inventory</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">New item</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add an item</h1>
          <p className="text-muted mt-1">Give something a name and a place to come home to.</p>
        </div>
      </header>

      {submitted && (
        <div className="bg-success/10 text-success flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{formData.name} is ready to add.</p>
            <p className="mt-0.5 opacity-80">
              This is a frontend preview. The item will be connected to your household when the data
              layer is enabled.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="border-border bg-surface space-y-5 rounded-2xl border p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Item basics</h2>
              <p className="text-muted mt-0.5 text-sm">
                Start with the details people will search for.
              </p>
            </div>

            <div>
              <label htmlFor="item-name" className="mb-1.5 block text-sm font-semibold">
                Item name <span className="text-danger">*</span>
              </label>
              <input
                id="item-name"
                type="text"
                required
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Passport, MacBook Pro"
                maxLength={100}
                autoFocus
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
              />
            </div>

            <div>
              <label htmlFor="item-description" className="mb-1.5 block text-sm font-semibold">
                Description <span className="text-muted font-normal">(optional)</span>
              </label>
              <textarea
                id="item-description"
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Add a detail that will help your household recognize it."
                rows={4}
                maxLength={500}
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category" htmlFor="item-category">
                <select
                  id="item-category"
                  value={formData.category}
                  onChange={(event) => updateField('category', event.target.value)}
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity" htmlFor="item-quantity">
                <input
                  id="item-quantity"
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
              <h2 className="text-lg font-bold">Where it belongs</h2>
              <p className="text-muted mt-0.5 text-sm">
                A location makes the next search much easier.
              </p>
            </div>

            <Field label="Storage spot" htmlFor="item-location">
              <select
                id="item-location"
                value={formData.location}
                onChange={(event) => updateField('location', event.target.value)}
                className={inputClass}
              >
                <option value="">Needs a home</option>
                {locations.map((location) => (
                  <option key={location}>{location}</option>
                ))}
              </select>
            </Field>

            <Field label="Status" htmlFor="item-status">
              <select
                id="item-status"
                value={formData.status}
                onChange={(event) =>
                  updateField('status', event.target.value as NewItemForm['status'])
                }
                className={inputClass}
              >
                <option>Stored</option>
                <option>Checked out</option>
                <option>Needs a home</option>
              </select>
            </Field>

            <Field label="Tags" htmlFor="item-tags" hint="Separate tags with commas.">
              <input
                id="item-tags"
                type="text"
                value={formData.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="e.g. travel, fragile, seasonal"
                className={inputClass}
              />
            </Field>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/items"
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
              Preview item
            </button>
          </div>
        </form>

        <aside className="space-y-6" aria-label="New item preview">
          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Live preview</h2>
                <p className="text-muted mt-0.5 text-sm">How it will look in your list.</p>
              </div>
              <Package size={19} className="text-primary" />
            </div>
            <div className="border-border rounded-2xl border p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Package size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{formData.name || 'Your item name'}</h3>
                  <p className="text-muted mt-0.5 text-sm">{formData.category}</p>
                </div>
              </div>
              <div className="text-muted space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{formData.location || 'Needs a home'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag size={14} />
                  <span>{formData.quantity || '0'} units</span>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-hover text-muted rounded-full px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="from-accent to-primary relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg shadow-violet-500/15">
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Helpful habit
              </p>
              <h2 className="mt-3 text-lg font-bold leading-snug">
                Name it the way you would search for it later.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Clear names beat vague labels when someone is in a hurry.
              </p>
            </div>
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10" />
          </section>

          {submitted && (
            <button
              type="button"
              onClick={resetForm}
              className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Add another item
            </button>
          )}
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
