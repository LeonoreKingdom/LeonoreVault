/**
 * Location entity — hierarchical physical locations.
 * Self-referential via `parent_id` (max depth 3).
 */
export interface Location {
  id: string;
  household_id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
}

/** Location with nested children (tree structure) */
export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
}
