/** Allowed item statuses matching the DB CHECK constraint */
export const ITEM_STATUSES = ['stored', 'borrowed', 'lost', 'in_lost_found'] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

/**
 * Human-readable labels and colors for status badges.
 * Colors follow Tailwind CSS naming conventions.
 */
export const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string }> = {
  stored: { label: 'Stored', color: 'green' },
  borrowed: { label: 'Borrowed', color: 'amber' },
  lost: { label: 'Lost', color: 'red' },
  in_lost_found: { label: 'In Lost & Found', color: 'blue' },
};

/**
 * Valid state transitions for items.
 * Key = current status, Value = allowed next statuses.
 */
export const STATUS_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  stored: ['borrowed', 'lost'],
  borrowed: ['stored', 'lost'],
  lost: ['in_lost_found', 'stored'],
  in_lost_found: ['stored'],
};
