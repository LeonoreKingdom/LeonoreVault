import type { CreateLocationSchema, UpdateLocationSchema } from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

interface LocationRow {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
}

interface TreeNode extends LocationRow {
  children: TreeNode[];
}

function mapLocation(row: LocationRow): LocationRow {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    parentId: row.parentId,
    description: row.description,
    sortOrder: row.sortOrder,
  };
}

function buildTree(flat: LocationRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const row of flat) map.set(row.id, { ...mapLocation(row), children: [] });
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) sortChildren(node.children);
  };
  sortChildren(roots);
  return roots;
}

async function assertParentInHousehold(parentId: string, householdId: string) {
  const repositories = await getInventoryRepositories();
  if (!(await repositories.locations.findByIdInHousehold(parentId, householdId))) {
    throw new AppError(400, 'The selected parent location is invalid', 'INVALID_PARENT');
  }
}

function mapDatabaseError(err: unknown, action: string): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('UNIQUE') || message.includes('unique')) {
    throw new AppError(409, 'A location with this name already exists at this level', 'DUPLICATE');
  }
  if (message.includes('FOREIGN KEY') || message.includes('foreign key')) {
    throw new AppError(400, 'The selected parent location is invalid', 'INVALID_PARENT');
  }
  logger.error({ err }, `Failed to ${action} location`);
  throw new AppError(500, `Failed to ${action} location`, 'INTERNAL_ERROR');
}

export async function getLocationTree(householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const rows = await repositories.locations.listByHousehold(householdId);
    return { tree: buildTree(rows as unknown as LocationRow[]) };
  } catch (err) {
    mapDatabaseError(err, 'fetch');
  }
}

export async function createLocation(householdId: string, payload: CreateLocationSchema) {
  if (payload.parent_id) await assertParentInHousehold(payload.parent_id, householdId);
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.locations.create({
      householdId,
      name: payload.name,
      parentId: payload.parent_id ?? null,
      description: payload.description ?? null,
      sortOrder: payload.sort_order ?? 0,
    });
    if (!row) throw new Error('Location insert returned no row');
    return { location: mapLocation(row as unknown as LocationRow) };
  } catch (err) {
    mapDatabaseError(err, 'create');
  }
}

export async function updateLocation(
  locationId: string,
  householdId: string,
  payload: UpdateLocationSchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.parent_id !== undefined) updateData.parentId = payload.parent_id;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.sort_order !== undefined) updateData.sortOrder = payload.sort_order;
  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'At least one location field is required', 'EMPTY_UPDATE');
  }
  if (payload.parent_id) {
    if (payload.parent_id === locationId) {
      throw new AppError(400, 'A location cannot be its own parent', 'INVALID_PARENT');
    }
    await assertParentInHousehold(payload.parent_id, householdId);
  }
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.locations.update(locationId, householdId, updateData);
    if (!row) throw new AppError(404, 'Location not found', 'NOT_FOUND');
    return { location: mapLocation(row as unknown as LocationRow) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'update');
  }
}

export async function deleteLocation(locationId: string, householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const deleted = await repositories.locations.remove(locationId, householdId);
    if (!deleted) throw new AppError(404, 'Location not found', 'NOT_FOUND');
    return { deleted: true, id: locationId };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'delete');
  }
}
