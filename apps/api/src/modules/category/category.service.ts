import type { CreateCategorySchema, UpdateCategorySchema } from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

// ─── Helpers ────────────────────────────────────────────────

interface CategoryRow {
  id: string;
  household_id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

interface TreeNode {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  children: TreeNode[];
}

function mapCategory(row: CategoryRow): Omit<TreeNode, 'children'> {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    parentId: row.parent_id,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

function buildTree(flat: CategoryRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const row of flat) {
    map.set(row.id, { ...mapCategory(row), children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by sort_order
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

async function assertParentInHousehold(parentId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('id', parentId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) {
    logger.error({ error: error.message }, 'Failed to validate category parent');
    throw new AppError(500, 'Failed to validate category parent', 'INTERNAL_ERROR');
  }
  if (!data) {
    throw new AppError(400, 'The selected parent category is invalid', 'INVALID_PARENT');
  }
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Get all categories for a household as a nested tree.
 */
export async function getCategoryTree(householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error({ error: error.message }, 'Failed to fetch categories');
    throw new AppError(500, 'Failed to fetch categories', 'INTERNAL_ERROR');
  }

  return { tree: buildTree(data as CategoryRow[]) };
}

/**
 * Create a new category. DB trigger enforces max 3 levels depth.
 */
export async function createCategory(householdId: string, payload: CreateCategorySchema) {
  if (payload.parent_id) await assertParentInHousehold(payload.parent_id, householdId);

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({
      household_id: householdId,
      name: payload.name,
      parent_id: payload.parent_id ?? null,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23514' || error.message.includes('depth')) {
      throw new AppError(400, 'Maximum category depth (3 levels) exceeded', 'DEPTH_EXCEEDED');
    }
    if (error.code === '23503' || error.message.includes('foreign key')) {
      throw new AppError(400, 'The selected parent category is invalid', 'INVALID_PARENT');
    }
    if (
      error.code === '23505' ||
      error.message.includes('unique') ||
      error.message.includes('duplicate')
    ) {
      throw new AppError(
        409,
        'A category with this name already exists at this level',
        'DUPLICATE',
      );
    }
    logger.error({ error: error.message }, 'Failed to create category');
    throw new AppError(500, 'Failed to create category', 'INTERNAL_ERROR');
  }

  return { category: mapCategory(data as CategoryRow) };
}

/**
 * Update a category.
 */
export async function updateCategory(
  categoryId: string,
  householdId: string,
  payload: UpdateCategorySchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.parent_id !== undefined) updateData.parent_id = payload.parent_id;
  if (payload.icon !== undefined) updateData.icon = payload.icon;
  if (payload.color !== undefined) updateData.color = payload.color;
  if (payload.sort_order !== undefined) updateData.sort_order = payload.sort_order;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'At least one category field is required', 'EMPTY_UPDATE');
  }
  if (payload.parent_id) {
    if (payload.parent_id === categoryId) {
      throw new AppError(400, 'A category cannot be its own parent', 'INVALID_PARENT');
    }
    await assertParentInHousehold(payload.parent_id, householdId);
  }

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(updateData)
    .eq('id', categoryId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) {
    if (error.code === '23514' || error.message.includes('depth')) {
      throw new AppError(400, 'Maximum category depth (3 levels) exceeded', 'DEPTH_EXCEEDED');
    }
    if (error.code === '23503' || error.message.includes('foreign key')) {
      throw new AppError(400, 'The selected parent category is invalid', 'INVALID_PARENT');
    }
    if (error.code === 'PGRST116') {
      throw new AppError(404, 'Category not found', 'NOT_FOUND');
    }
    logger.error({ error: error.message }, 'Failed to update category');
    throw new AppError(500, 'Failed to update category', 'INTERNAL_ERROR');
  }

  return { category: mapCategory(data as CategoryRow) };
}

/**
 * Delete a category. CASCADE on DB handles children.
 */
export async function deleteCategory(categoryId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('household_id', householdId)
    .select('id')
    .maybeSingle();

  if (error) {
    logger.error({ error: error.message }, 'Failed to delete category');
    throw new AppError(500, 'Failed to delete category', 'INTERNAL_ERROR');
  }
  if (!data) throw new AppError(404, 'Category not found', 'NOT_FOUND');

  return { deleted: true, id: categoryId };
}
