import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import {
  AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const id = (name = 'id') => text(name).primaryKey().$defaultFn(() => randomUUID());

const timestamp = (name: string) =>
  integer(name, { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: id(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    uniqueIndex('sessions_token_unique').on(table.token),
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ],
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: id(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    uniqueIndex('accounts_provider_account_unique').on(table.providerId, table.accountId),
    index('idx_accounts_user').on(table.userId),
  ],
);

export const verifications = sqliteTable(
  'verifications',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('idx_verifications_identifier').on(table.identifier),
    index('idx_verifications_expires_at').on(table.expiresAt),
  ],
);

export const households = sqliteTable(
  'households',
  {
    id: id(),
    name: text('name').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    inviteCode: text('invite_code'),
    inviteExpiresAt: integer('invite_expires_at', { mode: 'timestamp_ms' }),
    createdAt: timestamp('created_at'),
  },
  (table) => [
    uniqueIndex('households_invite_code_unique').on(table.inviteCode),
    index('idx_households_created_by').on(table.createdBy),
    check('households_name_length', sql`length(${table.name}) between 1 and 100`),
  ],
);

export const memberships = sqliteTable(
  'memberships',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'member', 'viewer'] }).notNull().default('member'),
    joinedAt: timestamp('joined_at'),
  },
  (table) => [
    uniqueIndex('memberships_user_household_unique').on(table.userId, table.householdId),
    index('idx_memberships_household').on(table.householdId),
    index('idx_memberships_user').on(table.userId),
  ],
);

export const categories = sqliteTable(
  'categories',
  {
    id: id(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => categories.id, {
      onDelete: 'cascade',
    }),
    icon: text('icon'),
    color: text('color'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('categories_household_parent_name_unique').on(
      table.householdId,
      table.parentId,
      table.name,
    ),
    index('idx_categories_household').on(table.householdId),
    index('idx_categories_parent').on(table.parentId),
    check('categories_name_length', sql`length(${table.name}) between 1 and 100`),
    check('categories_no_self_parent', sql`${table.id} <> ${table.parentId}`),
  ],
);

export const locations = sqliteTable(
  'locations',
  {
    id: id(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => locations.id, {
      onDelete: 'cascade',
    }),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('locations_household_parent_name_unique').on(
      table.householdId,
      table.parentId,
      table.name,
    ),
    index('idx_locations_household').on(table.householdId),
    index('idx_locations_parent').on(table.parentId),
    check('locations_name_length', sql`length(${table.name}) between 1 and 100`),
  ],
);

export const storageSpots = sqliteTable(
  'storage_spots',
  {
    id: id(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => storageSpots.id, {
      onDelete: 'cascade',
    }),
    spotType: text('spot_type', {
      enum: ['room', 'cabinet', 'shelf', 'drawer', 'box', 'other'],
    })
      .notNull()
      .default('other'),
    description: text('description'),
    capacity: integer('capacity').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    qrToken: text('qr_token').notNull().$defaultFn(() => randomUUID().replaceAll('-', '')),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    uniqueIndex('storage_spots_household_parent_name_unique').on(
      table.householdId,
      table.parentId,
      table.name,
    ),
    uniqueIndex('storage_spots_qr_token_unique').on(table.qrToken),
    index('idx_storage_spots_household').on(table.householdId),
    index('idx_storage_spots_parent').on(table.parentId),
    check('storage_spots_name_length', sql`length(${table.name}) between 1 and 100`),
    check('storage_spots_capacity_non_negative', sql`${table.capacity} >= 0`),
    check('storage_spots_no_self_parent', sql`${table.id} <> ${table.parentId}`),
  ],
);

export const items = sqliteTable(
  'items',
  {
    id: id(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    locationId: text('location_id').references(() => locations.id, { onDelete: 'set null' }),
    storageSpotId: text('storage_spot_id').references(() => storageSpots.id, {
      onDelete: 'set null',
    }),
    quantity: integer('quantity').notNull().default(1),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    status: text('status', {
      enum: ['stored', 'borrowed', 'lost', 'in_lost_found'],
    })
      .notNull()
      .default('stored'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    borrowedBy: text('borrowed_by').references(() => users.id, { onDelete: 'set null' }),
    borrowDueDate: integer('borrow_due_date', { mode: 'timestamp_ms' }),
    qrToken: text('qr_token').notNull().$defaultFn(() => randomUUID().replaceAll('-', '')),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('items_qr_token_unique').on(table.qrToken),
    index('idx_items_household').on(table.householdId),
    index('idx_items_household_status').on(table.householdId, table.status),
    index('idx_items_storage_spot').on(table.householdId, table.storageSpotId),
    index('idx_items_created_by').on(table.createdBy),
    check('items_name_length', sql`length(${table.name}) between 1 and 200`),
    check('items_quantity_positive', sql`${table.quantity} >= 1`),
  ],
);

export const attachments = sqliteTable(
  'attachments',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    bucket: text('bucket').notNull().default('leonorevault'),
    objectKey: text('object_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    thumbnailKey: text('thumbnail_key'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at'),
  },
  (table) => [
    index('idx_attachments_item').on(table.itemId),
    check('attachments_file_name_length', sql`length(${table.fileName}) between 1 and 255`),
    check('attachments_size_non_negative', sql`${table.sizeBytes} >= 0`),
  ],
);

export const itemActivities = sqliteTable(
  'item_activities',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: text('action', {
      enum: ['created', 'updated', 'moved', 'status_changed', 'attachment_added', 'attachment_removed'],
    }).notNull(),
    details: text('details', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at'),
  },
  (table) => [
    index('idx_activities_item_time').on(table.itemId, table.createdAt),
    index('idx_activities_user').on(table.userId),
  ],
);

export const borrowRecords = sqliteTable(
  'borrow_records',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    borrowedBy: text('borrowed_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    borrowedAt: timestamp('borrowed_at'),
    returnedAt: integer('returned_at', { mode: 'timestamp_ms' }),
    dueAt: integer('due_at', { mode: 'timestamp_ms' }),
    note: text('note'),
  },
  (table) => [
    index('idx_borrow_records_item_time').on(table.itemId, table.borrowedAt),
    index('idx_borrow_records_household_active').on(table.householdId, table.dueAt),
    index('idx_borrow_records_borrower').on(table.borrowedBy),
  ],
);

export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    itemId: text('item_id').references(() => items.id, { onDelete: 'set null' }),
    notificationType: text('notification_type', {
      enum: ['return_due_soon', 'return_overdue', 'item_returned', 'item_updated', 'household_activity'],
    }).notNull(),
    title: text('title').notNull(),
    body: text('body'),
    data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default(sql`'{}'`),
    readAt: integer('read_at', { mode: 'timestamp_ms' }),
    createdAt: timestamp('created_at'),
  },
  (table) => [
    index('idx_notifications_user_created_at').on(table.userId, table.createdAt),
    index('idx_notifications_household').on(table.householdId, table.createdAt),
  ],
);

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  dueSoonEnabled: integer('due_soon_enabled', { mode: 'boolean' }).notNull().default(true),
  overdueEnabled: integer('overdue_enabled', { mode: 'boolean' }).notNull().default(true),
  returnsEnabled: integer('returns_enabled', { mode: 'boolean' }).notNull().default(true),
  itemUpdatesEnabled: integer('item_updates_enabled', { mode: 'boolean' }).notNull().default(false),
  householdActivityEnabled: integer('household_activity_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  weeklySummaryEnabled: integer('weekly_summary_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  pauseAll: integer('pause_all', { mode: 'boolean' }).notNull().default(false),
  updatedAt: timestamp('updated_at'),
});

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  households,
  memberships,
  categories,
  locations,
  storageSpots,
  items,
  attachments,
  itemActivities,
  borrowRecords,
  notifications,
  notificationPreferences,
};
