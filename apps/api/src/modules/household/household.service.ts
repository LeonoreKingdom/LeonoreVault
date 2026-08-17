import type {
  CreateHouseholdSchema,
  JoinHouseholdSchema,
  UpdateMemberRoleSchema,
} from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function mapHousehold(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.createdBy ?? row.created_by,
    inviteCode: row.inviteCode ?? row.invite_code ?? null,
    inviteExpiresAt: row.inviteExpiresAt ?? row.invite_expires_at ?? null,
    createdAt: row.createdAt ?? row.created_at,
  };
}

function mapMembership(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    householdId: row.householdId ?? row.household_id,
    role: row.role,
    joinedAt: row.joinedAt ?? row.joined_at,
  };
}

function databaseError(err: unknown, message: string): never {
  logger.error({ err }, message);
  throw new AppError(500, message, 'INTERNAL_ERROR');
}

export async function createHousehold(userId: string, payload: CreateHouseholdSchema) {
  try {
    const repositories = await getInventoryRepositories();
    const user = await repositories.users.findById(userId);
    if (!user) throw new AppError(401, 'Authenticated user was not found', 'UNAUTHORIZED');
    if ((await repositories.memberships.listByUser(userId)).length > 0) {
      throw new AppError(409, 'You are already in a household', 'CONFLICT');
    }
    const household = await repositories.households.create({ name: payload.name, createdBy: userId });
    if (!household) throw new Error('Household insert returned no row');
    const membership = await repositories.memberships.create({
      userId,
      householdId: household.id,
      role: 'admin',
    });
    if (!membership) throw new Error('Membership insert returned no row');
    return {
      household: mapHousehold(household as unknown as Record<string, unknown>),
      membership: mapMembership(membership as unknown as Record<string, unknown>),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    databaseError(err, 'Failed to create household');
  }
}

export async function listHouseholds(userId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const rows = await repositories.households.listForUser(userId);
    return {
      households: rows.map(({ household, membership }) => ({
        household: mapHousehold(household as unknown as Record<string, unknown>),
        membership: mapMembership(membership as unknown as Record<string, unknown>),
      })),
    };
  } catch (err) {
    databaseError(err, 'Failed to list households');
  }
}

export async function getHousehold(householdId: string, userId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const membership = await repositories.memberships.findByUserAndHousehold(userId, householdId);
    if (!membership) throw new AppError(403, 'You are not a member of this household', 'FORBIDDEN');
    const household = await repositories.households.findById(householdId);
    if (!household) throw new AppError(404, 'Household not found', 'NOT_FOUND');
    const members = await repositories.memberships.listByHousehold(householdId);
    const mappedMembers = members.map(({ membership: member, user }) => ({
      ...mapMembership(member as unknown as Record<string, unknown>),
      user: {
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    }));
    return {
      household: mapHousehold(household as unknown as Record<string, unknown>),
      members: mappedMembers,
      memberCount: mappedMembers.length,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    databaseError(err, 'Failed to fetch household');
  }
}

export async function createInvite(householdId: string, userId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const user = await repositories.users.findById(userId);
    const membership = await repositories.memberships.findByUserAndHousehold(userId, householdId);
    if (!user || !membership || membership.role !== 'admin') {
      throw new AppError(403, 'Only admins can generate invite codes', 'FORBIDDEN');
    }
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (!(await repositories.households.update(householdId, { inviteCode, inviteExpiresAt: expiresAt }))) {
      throw new AppError(404, 'Household not found', 'NOT_FOUND');
    }
    return { inviteCode, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    if (err instanceof AppError) throw err;
    databaseError(err, 'Failed to generate invite code');
  }
}

export async function joinHousehold(userId: string, payload: JoinHouseholdSchema) {
  try {
    const repositories = await getInventoryRepositories();
    if (!(await repositories.users.findById(userId))) {
      throw new AppError(401, 'Authenticated user was not found', 'UNAUTHORIZED');
    }
    if ((await repositories.memberships.listByUser(userId)).length > 0) {
      throw new AppError(409, 'You are already in a household', 'ALREADY_MEMBER');
    }
    const household = await repositories.households.findByInviteCode(payload.invite_code);
    if (!household) throw new AppError(400, 'Invalid invite code', 'INVALID_CODE');
    if (household.inviteExpiresAt && household.inviteExpiresAt < new Date()) {
      throw new AppError(400, 'Invite code has expired', 'CODE_EXPIRED');
    }
    const membership = await repositories.memberships.create({
      userId,
      householdId: household.id,
      role: 'member',
    });
    if (!membership) throw new Error('Membership insert returned no row');
    return {
      household: mapHousehold(household as unknown as Record<string, unknown>),
      membership: mapMembership(membership as unknown as Record<string, unknown>),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    databaseError(err, 'Failed to join household');
  }
}

export async function changeMemberRole(
  householdId: string,
  targetUserId: string,
  adminUserId: string,
  payload: UpdateMemberRoleSchema,
) {
  try {
    const repositories = await getInventoryRepositories();
    const adminMembership = await repositories.memberships.findByUserAndHousehold(
      adminUserId,
      householdId,
    );
    if (!adminMembership || adminMembership.role !== 'admin') {
      throw new AppError(403, 'Only admins can change roles', 'FORBIDDEN');
    }
    const target = await repositories.memberships.findByUserAndHousehold(targetUserId, householdId);
    if (!target) throw new AppError(404, 'User is not a member of this household', 'NOT_FOUND');
    if (target.role === 'admin' && payload.role !== 'admin') {
      if ((await repositories.memberships.countAdmins(householdId)) <= 1) {
        throw new AppError(403, 'Cannot demote the last admin', 'FORBIDDEN');
      }
    }
    const updated = await repositories.memberships.updateRole(target.id, payload.role);
    if (!updated) throw new Error('Membership update returned no row');
    return { membership: mapMembership(updated as unknown as Record<string, unknown>) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    databaseError(err, 'Failed to update member role');
  }
}

export async function removeMember(householdId: string, targetUserId: string, adminUserId: string) {
  try {
    const repositories = await getInventoryRepositories();
    const adminMembership = await repositories.memberships.findByUserAndHousehold(
      adminUserId,
      householdId,
    );
    if (!adminMembership || adminMembership.role !== 'admin') {
      throw new AppError(403, 'Only admins can remove members', 'FORBIDDEN');
    }
    if (targetUserId === adminUserId && (await repositories.memberships.countAdmins(householdId)) <= 1) {
      throw new AppError(403, 'Cannot remove the last admin', 'FORBIDDEN');
    }
    const removed = await repositories.memberships.remove(targetUserId, householdId);
    if (!removed) throw new AppError(404, 'User is not a member of this household', 'NOT_FOUND');
    return { removed: true, userId: targetUserId };
  } catch (err) {
    if (err instanceof AppError) throw err;
    databaseError(err, 'Failed to remove member');
  }
}
