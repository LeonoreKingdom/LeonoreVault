import type {
  CreateHouseholdSchema,
  JoinHouseholdSchema,
  UpdateMemberRoleSchema,
} from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

// ─── Helpers ────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function mapHousehold(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    inviteCode: row.invite_code ?? null,
    inviteExpiresAt: row.invite_expires_at ?? null,
    driveFolderId: row.drive_folder_id ?? null,
    createdAt: row.created_at,
  };
}

function mapMembership(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    householdId: row.household_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Create a new household. The creator becomes admin.
 */
export async function createHousehold(userId: string, payload: CreateHouseholdSchema) {
  // Check if user is already in a household
  const { data: existing } = await supabaseAdmin
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (existing) {
    throw new AppError(409, 'You are already in a household', 'CONFLICT');
  }

  // Create household
  const { data: household, error: hError } = await supabaseAdmin
    .from('households')
    .insert({ name: payload.name, created_by: userId })
    .select()
    .single();

  if (hError || !household) {
    logger.error({ error: hError?.message }, 'Failed to create household');
    throw new AppError(500, 'Failed to create household', 'INTERNAL_ERROR');
  }

  // Create admin membership
  const { data: membership, error: mError } = await supabaseAdmin
    .from('memberships')
    .insert({
      user_id: userId,
      household_id: household.id,
      role: 'admin',
    })
    .select()
    .single();

  if (mError || !membership) {
    logger.error({ error: mError?.message }, 'Failed to create membership');
    throw new AppError(500, 'Failed to create membership', 'INTERNAL_ERROR');
  }

  return {
    household: mapHousehold(household),
    membership: mapMembership(membership),
  };
}

/**
 * Get household details with members list.
 */
export async function getHousehold(householdId: string, userId: string) {
  // Verify membership
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .single();

  if (!membership) {
    throw new AppError(403, 'You are not a member of this household', 'FORBIDDEN');
  }

  // Get household
  const { data: household, error } = await supabaseAdmin
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();

  if (error || !household) {
    throw new AppError(404, 'Household not found', 'NOT_FOUND');
  }

  // Get members with user details
  const { data: members } = await supabaseAdmin
    .from('memberships')
    .select('id, user_id, household_id, role, joined_at, users(display_name, email, avatar_url)')
    .eq('household_id', householdId);

  const mappedMembers = (members || []).map((m: Record<string, unknown>) => ({
    ...mapMembership(m),
    user: m.users || null,
  }));

  return {
    household: mapHousehold(household),
    members: mappedMembers,
    memberCount: mappedMembers.length,
  };
}

/**
 * Generate a 6-character invite code valid for 7 days.
 */
export async function createInvite(householdId: string, userId: string) {
  // Verify admin role
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .single();

  if (!membership || membership.role !== 'admin') {
    throw new AppError(403, 'Only admins can generate invite codes', 'FORBIDDEN');
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('households')
    .update({ invite_code: inviteCode, invite_expires_at: expiresAt })
    .eq('id', householdId);

  if (error) {
    logger.error({ error: error.message }, 'Failed to create invite code');
    throw new AppError(500, 'Failed to generate invite code', 'INTERNAL_ERROR');
  }

  return { inviteCode, expiresAt };
}

/**
 * Join a household using an invite code.
 */
export async function joinHousehold(userId: string, payload: JoinHouseholdSchema) {
  const code = payload.invite_code;

  // Check if user already in a household
  const { data: existing } = await supabaseAdmin
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (existing) {
    throw new AppError(409, 'You are already in a household', 'ALREADY_MEMBER');
  }

  // Find household by invite code
  const { data: household, error } = await supabaseAdmin
    .from('households')
    .select('*')
    .eq('invite_code', code)
    .single();

  if (error || !household) {
    throw new AppError(400, 'Invalid invite code', 'INVALID_CODE');
  }

  // Check expiration
  if (household.invite_expires_at && new Date(household.invite_expires_at) < new Date()) {
    throw new AppError(400, 'Invite code has expired', 'CODE_EXPIRED');
  }

  // Create membership as member
  const { data: membership, error: mError } = await supabaseAdmin
    .from('memberships')
    .insert({
      user_id: userId,
      household_id: household.id,
      role: 'member',
    })
    .select()
    .single();

  if (mError || !membership) {
    logger.error({ error: mError?.message }, 'Failed to join household');
    throw new AppError(500, 'Failed to join household', 'INTERNAL_ERROR');
  }

  return {
    household: mapHousehold(household),
    membership: mapMembership(membership),
  };
}

/**
 * Change a member's role within a household.
 */
export async function changeMemberRole(
  householdId: string,
  targetUserId: string,
  adminUserId: string,
  payload: UpdateMemberRoleSchema,
) {
  // Verify admin role of the requesting user
  const { data: adminMembership } = await supabaseAdmin
    .from('memberships')
    .select('role')
    .eq('user_id', adminUserId)
    .eq('household_id', householdId)
    .single();

  if (!adminMembership || adminMembership.role !== 'admin') {
    throw new AppError(403, 'Only admins can change roles', 'FORBIDDEN');
  }

  // Check target exists
  const { data: targetMembership } = await supabaseAdmin
    .from('memberships')
    .select('id, role')
    .eq('user_id', targetUserId)
    .eq('household_id', householdId)
    .single();

  if (!targetMembership) {
    throw new AppError(404, 'User is not a member of this household', 'NOT_FOUND');
  }

  // Prevent demoting the last admin
  if (targetMembership.role === 'admin' && payload.role !== 'admin') {
    const { count } = await supabaseAdmin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('role', 'admin');

    if ((count ?? 0) <= 1) {
      throw new AppError(403, 'Cannot demote the last admin', 'FORBIDDEN');
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('memberships')
    .update({ role: payload.role })
    .eq('id', targetMembership.id)
    .select()
    .single();

  if (error || !updated) {
    throw new AppError(500, 'Failed to update role', 'INTERNAL_ERROR');
  }

  return { membership: mapMembership(updated) };
}

/**
 * Remove a member from a household.
 */
export async function removeMember(
  householdId: string,
  targetUserId: string,
  adminUserId: string,
) {
  // Verify admin
  const { data: adminMembership } = await supabaseAdmin
    .from('memberships')
    .select('role')
    .eq('user_id', adminUserId)
    .eq('household_id', householdId)
    .single();

  if (!adminMembership || adminMembership.role !== 'admin') {
    throw new AppError(403, 'Only admins can remove members', 'FORBIDDEN');
  }

  // Can't remove self if last admin
  if (targetUserId === adminUserId) {
    const { count } = await supabaseAdmin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('role', 'admin');

    if ((count ?? 0) <= 1) {
      throw new AppError(403, 'Cannot remove the last admin', 'FORBIDDEN');
    }
  }

  const { error } = await supabaseAdmin
    .from('memberships')
    .delete()
    .eq('user_id', targetUserId)
    .eq('household_id', householdId);

  if (error) {
    throw new AppError(500, 'Failed to remove member', 'INTERNAL_ERROR');
  }

  return { removed: true, userId: targetUserId };
}
