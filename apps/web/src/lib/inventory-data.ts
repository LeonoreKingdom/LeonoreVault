export type InventoryTreeNode = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  children?: InventoryTreeNode[];
};

export function flattenInventoryTree(nodes: InventoryTreeNode[]): InventoryTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenInventoryTree(node.children ?? [])]);
}

export function labelFor(
  lookup: Map<string, InventoryTreeNode>,
  id: string | null | undefined,
  fallback = 'Unassigned',
) {
  return id ? lookup.get(id)?.name ?? fallback : fallback;
}

export function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return 'No update date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No update date';
  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function formatStatus(status: string) {
  if (status === 'borrowed') return 'Checked out';
  if (status === 'in_lost_found') return 'Needs review';
  if (status === 'lost') return 'Lost';
  return 'Stored';
}

export function statusClass(status: string) {
  if (status === 'borrowed') return 'bg-primary/10 text-primary';
  if (status === 'lost' || status === 'in_lost_found') return 'bg-warning/10 text-warning';
  return 'bg-success/10 text-success';
}
