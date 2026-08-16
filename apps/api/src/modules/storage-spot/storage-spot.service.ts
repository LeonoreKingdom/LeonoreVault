import type { CreateStorageSpotSchema, UpdateStorageSpotSchema } from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

interface StorageSpotRow {
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

interface StorageSpotItemRow {
  id: string;
  qr_token: string;
  name: string;
  description: string | null;
  category_id: string | null;
  location_id: string | null;
  storage_spot_id: string | null;
  quantity: number;
  tags: string[];
  status: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
  borrowed_by: string | null;
  borrow_due_date: string | null;
  updated_at: string;
}

export interface StorageSpotTreeNode {
  id: string;
  householdId: string;
  qrToken: string;
  name: string;
  parentId: string | null;
  spotType: StorageSpotRow['spot_type'];
  description: string | null;
  capacity: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children: StorageSpotTreeNode[];
}

function mapStorageSpot(row: StorageSpotRow): Omit<StorageSpotTreeNode, 'children'> {
  return {
    id: row.id,
    householdId: row.household_id,
    qrToken: row.qr_token,
    name: row.name,
    parentId: row.parent_id,
    spotType: row.spot_type,
    description: row.description,
    capacity: row.capacity,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildTree(flat: StorageSpotRow[]): StorageSpotTreeNode[] {
  const byId = new Map<string, StorageSpotTreeNode>();
  const roots: StorageSpotTreeNode[] = [];

  for (const row of flat) {
    byId.set(row.id, { ...mapStorageSpot(row), children: [] });
  }

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: StorageSpotTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of nodes) sortChildren(node.children);
  };
  sortChildren(roots);

  return roots;
}

function mapItem(row: StorageSpotItemRow) {
  return {
    id: row.id,
    qrToken: row.qr_token,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    locationId: row.location_id,
    storageSpotId: row.storage_spot_id,
    quantity: row.quantity,
    tags: row.tags,
    status: row.status,
    borrowedBy: row.borrowed_by,
    borrowDueDate: row.borrow_due_date,
    updatedAt: row.updated_at,
  };
}

function mapDatabaseError(error: { code?: string; message: string }, action: string): never {
  if (
    error.code === '23505' ||
    error.message.includes('duplicate') ||
    error.message.includes('unique')
  ) {
    throw new AppError(
      409,
      'A storage spot with this name already exists at this level',
      'DUPLICATE',
    );
  }
  if (error.code === '23503' || error.message.includes('foreign key')) {
    throw new AppError(400, 'The selected parent storage spot is invalid', 'INVALID_PARENT');
  }
  logger.error({ error: error.message }, `Failed to ${action} storage spot`);
  throw new AppError(500, `Failed to ${action} storage spot`, 'INTERNAL_ERROR');
}

export async function getStorageSpotTree(householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('storage_spots')
    .select('*')
    .eq('household_id', householdId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) mapDatabaseError(error, 'fetch');

  return { tree: buildTree((data || []) as StorageSpotRow[]) };
}

export async function getStorageSpotDetail(storageSpotId: string, householdId: string) {
  const { data: spot, error: spotError } = await supabaseAdmin
    .from('storage_spots')
    .select('*')
    .eq('id', storageSpotId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (spotError) mapDatabaseError(spotError, 'fetch');
  if (!spot) throw new AppError(404, 'Storage spot not found', 'NOT_FOUND');

  const [childrenResult, itemsResult] = await Promise.all([
    supabaseAdmin
      .from('storage_spots')
      .select('*')
      .eq('household_id', householdId)
      .eq('parent_id', storageSpotId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('items')
      .select(
        'id,qr_token,name,description,category_id,location_id,storage_spot_id,quantity,tags,status,borrowed_by,borrow_due_date,updated_at',
      )
      .eq('household_id', householdId)
      .eq('storage_spot_id', storageSpotId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
  ]);

  if (childrenResult.error) mapDatabaseError(childrenResult.error, 'fetch');
  if (itemsResult.error) mapDatabaseError(itemsResult.error, 'fetch');

  return {
    storageSpot: mapStorageSpot(spot as StorageSpotRow),
    children: (childrenResult.data || []).map((row) => mapStorageSpot(row as StorageSpotRow)),
    items: (itemsResult.data || []).map((row) => mapItem(row as StorageSpotItemRow)),
  };
}

export async function createStorageSpot(householdId: string, payload: CreateStorageSpotSchema) {
  const { data, error } = await supabaseAdmin
    .from('storage_spots')
    .insert({
      household_id: householdId,
      name: payload.name,
      parent_id: payload.parent_id ?? null,
      spot_type: payload.spot_type,
      description: payload.description ?? null,
      capacity: payload.capacity,
      sort_order: payload.sort_order,
    })
    .select()
    .single();

  if (error) mapDatabaseError(error, 'create');

  return { storageSpot: mapStorageSpot(data as StorageSpotRow) };
}

export async function updateStorageSpot(
  storageSpotId: string,
  householdId: string,
  payload: UpdateStorageSpotSchema,
) {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.parent_id !== undefined) updateData.parent_id = payload.parent_id;
  if (payload.spot_type !== undefined) updateData.spot_type = payload.spot_type;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
  if (payload.sort_order !== undefined) updateData.sort_order = payload.sort_order;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'At least one storage spot field is required', 'EMPTY_UPDATE');
  }

  const { data, error } = await supabaseAdmin
    .from('storage_spots')
    .update(updateData)
    .eq('id', storageSpotId)
    .eq('household_id', householdId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AppError(404, 'Storage spot not found', 'NOT_FOUND');
    }
    mapDatabaseError(error, 'update');
  }

  return { storageSpot: mapStorageSpot(data as StorageSpotRow) };
}

export async function deleteStorageSpot(storageSpotId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('storage_spots')
    .delete()
    .eq('id', storageSpotId)
    .eq('household_id', householdId)
    .select('id')
    .maybeSingle();

  if (error) mapDatabaseError(error, 'delete');
  if (!data) throw new AppError(404, 'Storage spot not found', 'NOT_FOUND');

  return { deleted: true, id: storageSpotId };
}
