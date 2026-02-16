'use client';

import { STATUS_CONFIG, ITEM_STATUSES } from '@leonorevault/shared';
type ItemStatus = (typeof ITEM_STATUSES)[number];

const colorMap: Record<string, string> = {
  green: 'bg-success/15 text-success',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-danger/15 text-danger',
  blue: 'bg-info/15 text-info',
};

interface StatusBadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md';
}

/**
 * Color-coded status pill badge.
 */
export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const colors = colorMap[config.color] || 'bg-muted/15 text-muted';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {config.label}
    </span>
  );
}
