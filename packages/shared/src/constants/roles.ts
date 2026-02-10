/** Allowed membership roles with increasing privilege */
export const MEMBERSHIP_ROLES = ['viewer', 'member', 'admin'] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

/**
 * Human-readable labels for each role.
 * Useful in UI dropdowns and role badges.
 */
export const ROLE_LABELS: Record<MembershipRole, string> = {
  viewer: 'Viewer',
  member: 'Member',
  admin: 'Admin',
};
