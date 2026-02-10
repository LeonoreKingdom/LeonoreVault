/** Activity action types matching the DB CHECK constraint on item_activities */
export const ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'moved',
  'status_changed',
  'attachment_added',
  'attachment_removed',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** Maximum nesting depth for categories and locations */
export const MAX_HIERARCHY_DEPTH = 3;

/** Maximum number of attachments per item */
export const MAX_ATTACHMENTS_PER_ITEM = 10;

/** Maximum number of tags per item */
export const MAX_TAGS_PER_ITEM = 20;

/** Maximum length of a single tag */
export const MAX_TAG_LENGTH = 50;

/** Invite code length (uppercase alphanumeric) */
export const INVITE_CODE_LENGTH = 6;

/** Invite code expiry duration in hours */
export const INVITE_CODE_EXPIRY_HOURS = 48;

/** Soft-deleted items are purged after this many days */
export const SOFT_DELETE_RETENTION_DAYS = 30;

/** Default page size for paginated queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size to prevent abuse */
export const MAX_PAGE_SIZE = 100;
