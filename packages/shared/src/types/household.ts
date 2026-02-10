import type { MembershipRole } from '../constants/roles.js';

/**
 * Household entity — a logical grouping for inventory items.
 * All items, categories, and locations belong to a household.
 */
export interface Household {
  id: string;
  name: string;
  created_by: string;
  invite_code: string | null;
  invite_expires_at: string | null;
  drive_folder_id: string | null;
  created_at: string;
}

/**
 * Membership — the association between a user and a household,
 * carrying the role (admin, member, viewer).
 */
export interface Membership {
  id: string;
  user_id: string;
  household_id: string;
  role: MembershipRole;
  joined_at: string;
}

/** Household with its member list (used in detail views) */
export interface HouseholdWithMembers extends Household {
  members: (Membership & {
    user: {
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  })[];
}
