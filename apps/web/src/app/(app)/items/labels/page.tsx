'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useItemsStore, type Item } from '@/stores/items';
import { apiDownload } from '@/lib/api';
import { ArrowLeft, QrCode, Download, Loader2, CheckSquare, Square, Printer } from 'lucide-react';

type Layout = 'grid-8' | 'grid-24';

export default function PrintLabelsPage() {
  const { membership } = useAuthStore();
  const { items, loading, fetchItems } = useItemsStore();
  const householdId = membership?.householdId;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>('grid-8');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (householdId) fetchItems(householdId);
  }, [householdId, fetchItems]);

  // ─── Selection ──────────────────────────────────────────

  const toggleItem = (id: string) => {
    setPreviewItemId(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewItem = items.find((item) => item.id === previewItemId) ?? items[0] ?? null;

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  // ─── Download single QR ─────────────────────────────────

  const downloadQr = async (item: Item) => {
    if (!householdId) return;
    try {
      const blob = await apiDownload(
        `/api/households/${householdId}/items/${item.id}/qr?format=png&size=512`,
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${item.name}-qr.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError('Failed to download QR code');
    }
  };

  // ─── Generate batch PDF ─────────────────────────────────

  const generatePdf = async () => {
    if (!householdId || selected.size === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const blob = await apiDownload(`/api/households/${householdId}/items/qr-batch`, {
        method: 'POST',
        body: { itemIds: Array.from(selected), layout },
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `qr-labels-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-muted flex items-center gap-2 text-sm">
        <Link href="/items" className="hover:text-foreground transition-colors">
          Items
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Print Labels</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/items"
            className="text-muted hover:text-foreground hover:bg-hover rounded-xl p-2 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Print Labels</h1>
            <p className="text-muted text-sm">Select items to generate QR code labels</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Layout Picker */}
          <div className="border-border flex rounded-xl border">
            <button
              onClick={() => setLayout('grid-8')}
              className={`rounded-l-xl px-3 py-2 text-sm font-medium transition-colors ${
                layout === 'grid-8' ? 'bg-primary text-white' : 'hover:bg-hover'
              }`}
            >
              2×4
            </button>
            <button
              onClick={() => setLayout('grid-24')}
              className={`rounded-r-xl px-3 py-2 text-sm font-medium transition-colors ${
                layout === 'grid-24' ? 'bg-primary text-white' : 'hover:bg-hover'
              }`}
            >
              4×6
            </button>
          </div>

          {/* Generate PDF */}
          <button
            onClick={generatePdf}
            disabled={selected.size === 0 || generating}
            className="from-primary to-accent bg-linear-to-r flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            Generate PDF
            {selected.size > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{selected.size}</span>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Select All Bar */}
      <div className="border-border bg-surface flex items-center justify-between rounded-xl border px-4 py-3">
        <button
          onClick={toggleAll}
          className="text-muted hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
        >
          {selected.size === items.length && items.length > 0 ? (
            <CheckSquare size={18} className="text-primary" />
          ) : (
            <Square size={18} />
          )}
          {selected.size === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-muted text-sm">
          {selected.size} of {items.length} selected
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="text-primary animate-spin" />
        </div>
      )}

      {/* Item List */}
      {!loading && items.length === 0 && (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
          <QrCode size={48} className="text-muted-light mb-4" />
          <h2 className="text-xl font-bold">No Items</h2>
          <p className="text-muted mt-1">Add items first to generate labels.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`border-border hover:bg-hover group flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                  isSelected ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                {/* Checkbox */}
                {isSelected ? (
                  <CheckSquare size={20} className="text-primary flex-shrink-0" />
                ) : (
                  <Square size={20} className="text-muted flex-shrink-0" />
                )}

                {/* Item info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-muted truncate text-sm">
                    {item.id.slice(0, 8)}
                    {item.description ? ` · ${item.description}` : ''}
                  </p>
                </div>

                {/* QR icon */}
                <QrCode size={20} className="text-muted-light flex-shrink-0" />

                {/* Single download */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadQr(item);
                  }}
                  className="text-muted hover:text-primary flex-shrink-0 rounded-lg p-2 opacity-0 transition-all group-hover:opacity-100"
                  title="Download QR PNG"
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Label Preview */}
      {!loading && previewItem && (
        <section
          className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
          aria-labelledby="label-preview-heading"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-primary text-xs font-semibold uppercase tracking-[0.16em]">
                Preview
              </p>
              <h2 id="label-preview-heading" className="mt-1 text-lg font-bold">
                QR label for {previewItem.name}
              </h2>
              <p className="text-muted mt-0.5 text-sm">
                Check the label before downloading or printing it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadQr(previewItem)}
              className="border-border text-foreground hover:bg-hover inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <Download size={16} />
              Download PNG
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div className="border-border bg-background mx-auto w-full max-w-[220px] rounded-2xl border p-4 text-center">
              <div className="flex aspect-square items-center justify-center rounded-xl bg-white p-4 text-slate-950 shadow-inner">
                <QrCode size={144} strokeWidth={1.1} aria-label="QR code preview" />
              </div>
              <p className="mt-3 truncate text-sm font-bold">{previewItem.name}</p>
              <p className="text-muted mt-1 text-xs">LV · {previewItem.id.slice(0, 8)}</p>
            </div>

            <div className="space-y-3">
              <div className="bg-primary/5 text-muted rounded-xl px-4 py-3 text-sm">
                <p className="text-foreground font-semibold">Selected item</p>
                <p className="mt-1">{previewItem.name}</p>
              </div>
              <div className="border-border rounded-xl border border-dashed px-4 py-3 text-sm">
                <p className="font-semibold">Print layout</p>
                <p className="text-muted mt-1">
                  {layout === 'grid-8' ? '2 × 4 labels per sheet' : '4 × 6 labels per sheet'}
                </p>
              </div>
              <p className="text-muted-light text-xs">
                This preview uses mock QR artwork. The generated file will use the item token when
                the data layer is connected.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
