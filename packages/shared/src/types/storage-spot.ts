/**
 * Storage spot entity for the storage-organization experience.
 * Self-referential via `parent_id`; NULL means a household root.
 */
export interface StorageSpot {
  id: string;
  household_id: string;
  qr_token: string;
  name: string;
  parent_id: string | null;
  spot_type: 'room' | 'cabinet' | 'shelf' | 'drawer' | 'box' | 'other';
  description: string | null;
  capacity: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Storage spot with nested children for tree views. */
export interface StorageSpotTreeNode extends StorageSpot {
  children: StorageSpotTreeNode[];
}
