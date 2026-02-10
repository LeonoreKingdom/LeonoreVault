/**
 * Category entity — hierarchical taxonomy for items.
 * Self-referential via `parent_id` (max depth 3).
 */
export interface Category {
  id: string;
  household_id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

/** Category with nested children (tree structure) */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
