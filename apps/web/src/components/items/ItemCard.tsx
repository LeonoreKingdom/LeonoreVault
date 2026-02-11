'use client';

import Link from 'next/link';
import { MapPin, Tag, Package } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import type { Item } from '@/stores/items';

interface ItemCardProps {
  item: Item;
}

/**
 * Item card for the list view.
 * Shows name, location, category, status badge, and quantity.
 */
export default function ItemCard({ item }: ItemCardProps) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="border-border bg-surface hover:border-primary/30 group flex flex-col rounded-2xl border p-5 transition-all duration-300 hover:shadow-md"
    >
      {/* Top Row: Name + Status */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{item.name}</h3>
            {item.description && (
              <p className="text-muted mt-0.5 line-clamp-1 text-sm">{item.description}</p>
            )}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Bottom Row: Meta info */}
      <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {item.categoryId && (
          <span className="flex items-center gap-1.5">
            <Tag size={14} />
            <span className="truncate">Category</span>
          </span>
        )}
        {item.locationId && (
          <span className="flex items-center gap-1.5">
            <MapPin size={14} />
            <span className="truncate">Location</span>
          </span>
        )}
        {item.quantity > 1 && <span className="text-xs font-medium">×{item.quantity}</span>}
        {item.tags.length > 0 && (
          <div className="flex gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-hover text-muted rounded-full px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-muted-light text-xs">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
