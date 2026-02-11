'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useItemsStore } from '@/stores/items';
import ItemForm from '@/components/items/ItemForm';
import { Loader2, Package } from 'lucide-react';
import Link from 'next/link';

/**
 * Edit item page — fetches the item, then renders ItemForm in edit mode.
 */
export default function EditItemPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { membership } = useAuthStore();
  const { selectedItem: item, loading, error, fetchItem, clearSelected } = useItemsStore();
  const householdId = membership?.householdId;

  useEffect(() => {
    if (householdId && itemId) {
      fetchItem(householdId, itemId);
    }
    return () => clearSelected();
  }, [householdId, itemId, fetchItem, clearSelected]);

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
        <p className="text-muted mb-6">{error || 'Unable to load item for editing.'}</p>
        <Link
          href="/items"
          className="from-primary to-accent rounded-xl bg-gradient-to-r px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to Items
        </Link>
      </div>
    );
  }

  return <ItemForm item={item} />;
}
