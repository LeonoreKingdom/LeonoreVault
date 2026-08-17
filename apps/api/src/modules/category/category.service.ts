import type { CreateCategorySchema, UpdateCategorySchema } from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

interface CategoryRow {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

interface TreeNode extends CategoryRow {
  children: TreeNode[];
}

function mapCategory(row: CategoryRow): CategoryRow {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    parentId: row.parentId,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sortOrder,
  };
}

function buildTree(flat: CategoryRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const row of flat) map.set(row.id, { ...mapCategory(row), children: [] });
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
  if (!(await repositories.categories.findByIdInHousehold(parentId, householdId))) {
    throw new AppError(400, 'The selected parent category is invalid', 'INVALID_PARENT');
  }
}

function mapDatabaseError(err: unknown, action: string): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('UNIQUE') || message.includes('unique')) {
    throw new AppError(409, 'A category with this name already exists at this level', 'DUPLICATE');
  }
  if (message.includes('FOREIGN KEY') || message.includes('foreign key')) {
    throw new AppError(400, 'The selected parent category is invalid', 'INVALID_PARENT');
  }
  logger.error({ err }, `Failed to ${action} category`);
  throw new AppError(500, `Failed to ${action} category`, 'INTERNAL_ERROR');
}

export async function getCategoryTree(householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const rows = await repositories.categories.listByHousehold(householdId);
    return { tree: buildTree(rows as unknown as CategoryRow[]) };
  } catch (err) {
    mapDatabaseError(err, 'fetch');
  }
}

export async function createCategory(householdId: string, payload: CreateCategorySchema) {
  if (payload.parent_id) await assertParentInHousehold(payload.parent_id, householdId);
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.categories.create({
      householdId,
      name: payload.name,
      parentId: payload.parent_id ?? null,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
      sortOrder: payload.sort_order ?? 0,
    });
    if (!row) throw new Error('Category insert returned no row');
    return { category: mapCategory(row as unknown as CategoryRow) };
  } catch (err) {
    mapDatabaseError(err, 'create');
  }
}

export async function updateCategory(
  categoryId: string,
  householdId: string,
  payload: UpdateCategorySchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.parent_id !== undefined) updateData.parentId = payload.parent_id;
  if (payload.icon !== undefined) updateData.icon = payload.icon;
  if (payload.color !== undefined) updateData.color = payload.color;
  if (payload.sort_order !== undefined) updateData.sortOrder = payload.sort_order;
  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'At least one category field is required', 'EMPTY_UPDATE');
  }
  if (payload.parent_id) {
    if (payload.parent_id === categoryId) {
      throw new AppError(400, 'A category cannot be its own parent', 'INVALID_PARENT');
    }
    await assertParentInHousehold(payload.parent_id, householdId);
  }
  try {
    const repositories = await getInventoryRepositories();
    const row = await repositories.categories.update(categoryId, householdId, updateData);
    if (!row) throw new AppError(404, 'Category not found', 'NOT_FOUND');
    return { category: mapCategory(row as unknown as CategoryRow) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'update');
  }
}

export async function deleteCategory(categoryId: string, householdId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const deleted = await repositories.categories.remove(categoryId, householdId);
    if (!deleted) throw new AppError(404, 'Category not found', 'NOT_FOUND');
    return { deleted: true, id: categoryId };
  } catch (err) {
    if (err instanceof AppError) throw err;
    mapDatabaseError(err, 'delete');
  }
}
