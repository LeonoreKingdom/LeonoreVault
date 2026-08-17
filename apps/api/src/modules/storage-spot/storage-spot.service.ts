import type { CreateStorageSpotSchema, UpdateStorageSpotSchema } from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

interface StorageSpotRow {
  id: string;
  householdId: string;
  qrToken: string;
  name: string;
  parentId: string | null;
  spotType: 'room' | 'cabinet' | 'shelf' | 'drawer' | 'box' | 'other';
  description: string | null;
  capacity: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StorageSpotTreeNode extends StorageSpotRow {
  children: StorageSpotTreeNode[];
}

function mapStorageSpot(row: StorageSpotRow): Omit<StorageSpotTreeNode, 'children'> {
  return { ...row };
}

function buildTree(flat: StorageSpotRow[]): StorageSpotTreeNode[] {
  const byId = new Map<string, StorageSpotTreeNode>();
  const roots: StorageSpotTreeNode[] = [];
  for (const row of flat) byId.set(row.id, { ...mapStorageSpot(row), children: [] });
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sortChildren = (nodes: StorageSpotTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) sortChildren(node.children);
  };
  sortChildren(roots);
  return roots;
}

function mapItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    qrToken: row.qrToken,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.categoryId ?? null,
    locationId: row.locationId ?? null,
    storageSpotId: row.storageSpotId ?? null,
    quantity: row.quantity,
    tags: row.tags ?? [],
    status: row.status,
    borrowedBy: row.borrowedBy ?? null,
    borrowDueDate: row.borrowDueDate ?? null,
    updatedAt: row.updatedAt,
  };
}

function mapDatabaseError(err: unknown, action: string): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('UNIQUE') || message.includes('unique')) {
    throw new AppError(
      409,
      'A storage spot with this name already exists at this level',
      'DUPLICATE',
    );
  }
  if (message.includes('FOREIGN KEY') || message.includes('foreign key')) {
    throw new AppError(400, 'The selected parent storage spot is invalid', 'INVALID_PARENT');
  }
  logger.error({ err }, `Failed to ${action} storage spot`);
  throw new AppError(500, `Failed to ${action} storage spot`, 'INTERNAL_ERROR');
}

export async function getStorageSpotTree(householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const rows = await repositories.storageSpots.listByHousehold(householdId);
    return { tree: buildTree(rows as unknown as StorageSpotRow[]) };
  } catch (err) {
    mapDatabaseError(err, 'fetch');
  }
}

export async function getStorageSpotDetail(storageSpotId: string, householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const spot = await repositories.storageSpots.findByIdInHousehold(storageSpotId, householdId);
    if (!spot) throw new AppError(404, 'Storage spot not found', 'NOT_FOUND');
    const [allSpots, itemResult] = await Promise.all([
      repositories.storageSpots.listByHousehold(householdId),
      repositories.items.listByHousehold(householdId, { storageSpotId }),
    ]);
    const children = allSpots.filter((candidate) => candidate.parentId === storageSpotId);
    return {
      storageSpot: mapStorageSpot(spot as unknown as StorageSpotRow),
      children: children.map((row) => mapStorageSpot(row as unknown as StorageSpotRow)),
      items: itemResult.items.map((row) => mapItem(row as unknown as Record<string, unknown>)),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'fetch');
  }
}

export async function createStorageSpot(householdId: string, payload: CreateStorageSpotSchema) {
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.storageSpots.create({
      householdId,
      name: payload.name,
      parentId: payload.parent_id ?? null,
      spotType: payload.spot_type,
      description: payload.description ?? null,
      capacity: payload.capacity,
      sortOrder: payload.sort_order,
    });
    if (!row) throw new Error('Storage spot insert returned no row');
    return { storageSpot: mapStorageSpot(row as unknown as StorageSpotRow) };
  } catch (err) {
    mapDatabaseError(err, 'create');
  }
}

export async function updateStorageSpot(
  storageSpotId: string,
  householdId: string,
  payload: UpdateStorageSpotSchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.parent_id !== undefined) updateData.parentId = payload.parent_id;
  if (payload.spot_type !== undefined) updateData.spotType = payload.spot_type;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
  if (payload.sort_order !== undefined) updateData.sortOrder = payload.sort_order;
  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'At least one storage spot field is required', 'EMPTY_UPDATE');
  }
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.storageSpots.update(storageSpotId, householdId, updateData);
    if (!row) throw new AppError(404, 'Storage spot not found', 'NOT_FOUND');
    return { storageSpot: mapStorageSpot(row as unknown as StorageSpotRow) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'update');
  }
}

export async function deleteStorageSpot(storageSpotId: string, householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const deleted = await repositories.storageSpots.remove(storageSpotId, householdId);
    if (!deleted) throw new AppError(404, 'Storage spot not found', 'NOT_FOUND');
    return { deleted: true, id: storageSpotId };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'delete');
  }
}
