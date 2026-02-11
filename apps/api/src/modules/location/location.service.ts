import type { CreateLocationSchema, UpdateLocationSchema } from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

// ─── Helpers ────────────────────────────────────────────────

interface LocationRow {
  id: string;
  household_id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
}

interface TreeNode {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  children: TreeNode[];
}

function mapLocation(row: LocationRow): Omit<TreeNode, 'children'> {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    parentId: row.parent_id,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function buildTree(flat: LocationRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const row of flat) {
    map.set(row.id, { ...mapLocation(row), children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

// ─── Service Functions ──────────────────────────────────────

export async function getLocationTree(householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('locations')
    .select('*')
    .eq('household_id', householdId)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error({ error: error.message }, 'Failed to fetch locations');
    throw new AppError(500, 'Failed to fetch locations', 'INTERNAL_ERROR');
  }

  return { tree: buildTree(data as LocationRow[]) };
}

export async function createLocation(
  householdId: string,
  payload: CreateLocationSchema,
) {
  const { data, error } = await supabaseAdmin
    .from('locations')
    .insert({
      household_id: householdId,
      name: payload.name,
      parent_id: payload.parent_id ?? null,
      description: payload.description ?? null,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('depth')) {
      throw new AppError(400, 'Maximum location depth (3 levels) exceeded', 'DEPTH_EXCEEDED');
    }
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      throw new AppError(409, 'A location with this name already exists at this level', 'DUPLICATE');
    }
    logger.error({ error: error.message }, 'Failed to create location');
    throw new AppError(500, 'Failed to create location', 'INTERNAL_ERROR');
  }

  return { location: mapLocation(data as LocationRow) };
}

export async function updateLocation(
  locationId: string,
  householdId: string,
  payload: UpdateLocationSchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.parent_id !== undefined) updateData.parent_id = payload.parent_id;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.sort_order !== undefined) updateData.sort_order = payload.sort_order;

  const { data, error } = await supabaseAdmin
    .from('locations')
    .update(updateData)
    .eq('id', locationId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) {
    if (error.message.includes('depth')) {
      throw new AppError(400, 'Maximum location depth (3 levels) exceeded', 'DEPTH_EXCEEDED');
    }
    if (error.code === 'PGRST116') {
      throw new AppError(404, 'Location not found', 'NOT_FOUND');
    }
    logger.error({ error: error.message }, 'Failed to update location');
    throw new AppError(500, 'Failed to update location', 'INTERNAL_ERROR');
  }

  return { location: mapLocation(data as LocationRow) };
}

export async function deleteLocation(locationId: string, householdId: string) {
  const { error } = await supabaseAdmin
    .from('locations')
    .delete()
    .eq('id', locationId)
    .eq('household_id', householdId);

  if (error) {
    logger.error({ error: error.message }, 'Failed to delete location');
    throw new AppError(500, 'Failed to delete location', 'INTERNAL_ERROR');
  }

  return { deleted: true, id: locationId };
}
