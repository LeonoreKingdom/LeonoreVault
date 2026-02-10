import type { ActivityAction } from '../constants/defaults.js';

/**
 * Item activity log entry — an immutable audit trail
 * recording every change made to an item.
 */
export interface ItemActivity {
  id: string;
  item_id: string;
  user_id: string;
  action: ActivityAction;
  details: Record<string, unknown> | null;
  created_at: string;
}
