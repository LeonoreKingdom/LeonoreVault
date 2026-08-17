import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '../client.js';
import { schema } from '../schema.js';

type AppDatabase = typeof db;
type UserInsert = typeof schema.users.$inferInsert;
type HouseholdInsert = typeof schema.households.$inferInsert;
type MembershipInsert = typeof schema.memberships.$inferInsert;
type CategoryInsert = typeof schema.categories.$inferInsert;
type LocationInsert = typeof schema.locations.$inferInsert;
type StorageSpotInsert = typeof schema.storageSpots.$inferInsert;
type ItemInsert = typeof schema.items.$inferInsert;
type AttachmentInsert = typeof schema.attachments.$inferInsert;
type ActivityInsert = typeof schema.itemActivities.$inferInsert;
type BorrowRecordInsert = typeof schema.borrowRecords.$inferInsert;
type NotificationInsert = typeof schema.notifications.$inferInsert;
type NotificationPreferenceInsert = typeof schema.notificationPreferences.$inferInsert;

export interface ItemListFilters {
  search?: string;
  status?: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
  categoryId?: string;
  locationId?: string;
  storageSpotId?: string;
  tags?: string[];
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

function first<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

function householdConditions(householdId: string) {
  return [eq(schema.items.householdId, householdId), isNull(schema.items.deletedAt)];
}

function itemConditions(householdId: string, filters: ItemListFilters) {
  const conditions = [eq(schema.items.householdId, householdId)];

  if (!filters.includeDeleted) conditions.push(isNull(schema.items.deletedAt));
  if (filters.status) conditions.push(eq(schema.items.status, filters.status));
  if (filters.categoryId) conditions.push(eq(schema.items.categoryId, filters.categoryId));
  if (filters.locationId) conditions.push(eq(schema.items.locationId, filters.locationId));
  if (filters.storageSpotId) {
    conditions.push(eq(schema.items.storageSpotId, filters.storageSpotId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(like(schema.items.name, term), like(schema.items.description, term))!);
  }
  for (const tag of filters.tags ?? []) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM json_each(${schema.items.tags}) AS item_tag WHERE item_tag.value = ${tag})`,
    );
  }

  return conditions;
}

/**
 * Drizzle data-access boundary for the household inventory domain.
 *
 * Every household-scoped method requires a household id so callers cannot
 * accidentally turn a repository query into a cross-household read.
 * Pass a database instance to the factory in tests; production uses `db`.
 */
export function createInventoryRepositories(database: AppDatabase = db) {
  const users = {
    async findById(userId: string) {
      return first(
        await database.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
      );
    },

    async findByEmail(email: string) {
      return first(
        await database.select().from(schema.users).where(eq(schema.users.email, email)).limit(1),
      );
    },

    async create(values: UserInsert) {
      return first(await database.insert(schema.users).values(values).returning());
    },

    async update(userId: string, values: Partial<UserInsert>) {
      return first(
        await database
          .update(schema.users)
          .set(values)
          .where(eq(schema.users.id, userId))
          .returning(),
      );
    },
  };

  const households = {
    async findById(householdId: string) {
      return first(
        await database
          .select()
          .from(schema.households)
          .where(eq(schema.households.id, householdId))
          .limit(1),
      );
    },

    async findByInviteCode(inviteCode: string) {
      return first(
        await database
          .select()
          .from(schema.households)
          .where(eq(schema.households.inviteCode, inviteCode))
          .limit(1),
      );
    },

    async create(values: HouseholdInsert) {
      return first(await database.insert(schema.households).values(values).returning());
    },

    async update(householdId: string, values: Partial<HouseholdInsert>) {
      return first(
        await database
          .update(schema.households)
          .set(values)
          .where(eq(schema.households.id, householdId))
          .returning(),
      );
    },

    async listForUser(userId: string) {
      return database
        .select({ household: schema.households, membership: schema.memberships })
        .from(schema.memberships)
        .innerJoin(
          schema.households,
          eq(schema.memberships.householdId, schema.households.id),
        )
        .where(eq(schema.memberships.userId, userId))
        .orderBy(desc(schema.memberships.joinedAt));
    },
  };

  const memberships = {
    async findById(membershipId: string) {
      return first(
        await database
          .select()
          .from(schema.memberships)
          .where(eq(schema.memberships.id, membershipId))
          .limit(1),
      );
    },

    async findByUserAndHousehold(userId: string, householdId: string) {
      return first(
        await database
          .select()
          .from(schema.memberships)
          .where(
            and(
              eq(schema.memberships.userId, userId),
              eq(schema.memberships.householdId, householdId),
            ),
          )
          .limit(1),
      );
    },

    async listByUser(userId: string) {
      return database
        .select()
        .from(schema.memberships)
        .where(eq(schema.memberships.userId, userId))
        .orderBy(desc(schema.memberships.joinedAt));
    },

    async listByHousehold(householdId: string) {
      return database
        .select({ membership: schema.memberships, user: schema.users })
        .from(schema.memberships)
        .innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id))
        .where(eq(schema.memberships.householdId, householdId))
        .orderBy(asc(schema.users.displayName), asc(schema.users.email));
    },

    async create(values: MembershipInsert) {
      return first(await database.insert(schema.memberships).values(values).returning());
    },

    async updateRole(membershipId: string, role: 'admin' | 'member' | 'viewer') {
      return first(
        await database
          .update(schema.memberships)
          .set({ role })
          .where(eq(schema.memberships.id, membershipId))
          .returning(),
      );
    },

    async remove(userId: string, householdId: string) {
      return first(
        await database
          .delete(schema.memberships)
          .where(
            and(
              eq(schema.memberships.userId, userId),
              eq(schema.memberships.householdId, householdId),
            ),
          )
          .returning({ id: schema.memberships.id }),
      );
    },

    async countAdmins(householdId: string) {
      const result = await database
        .select({ count: count() })
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.householdId, householdId),
            eq(schema.memberships.role, 'admin'),
          ),
        );
      return Number(result[0]?.count ?? 0);
    },
  };

  const categories = {
    async listByHousehold(householdId: string) {
      return database
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.householdId, householdId))
        .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
    },

    async findByIdInHousehold(categoryId: string, householdId: string) {
      return first(
        await database
          .select()
          .from(schema.categories)
          .where(
            and(
              eq(schema.categories.id, categoryId),
              eq(schema.categories.householdId, householdId),
            ),
          )
          .limit(1),
      );
    },

    async create(values: CategoryInsert) {
      return first(await database.insert(schema.categories).values(values).returning());
    },

    async update(categoryId: string, householdId: string, values: Partial<CategoryInsert>) {
      return first(
        await database
          .update(schema.categories)
          .set(values)
          .where(
            and(
              eq(schema.categories.id, categoryId),
              eq(schema.categories.householdId, householdId),
            ),
          )
          .returning(),
      );
    },

    async remove(categoryId: string, householdId: string) {
      return first(
        await database
          .delete(schema.categories)
          .where(
            and(
              eq(schema.categories.id, categoryId),
              eq(schema.categories.householdId, householdId),
            ),
          )
          .returning({ id: schema.categories.id }),
      );
    },
  };

  const locations = {
    async listByHousehold(householdId: string) {
      return database
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.householdId, householdId))
        .orderBy(asc(schema.locations.sortOrder), asc(schema.locations.name));
    },

    async findByIdInHousehold(locationId: string, householdId: string) {
      return first(
        await database
          .select()
          .from(schema.locations)
          .where(
            and(
              eq(schema.locations.id, locationId),
              eq(schema.locations.householdId, householdId),
            ),
          )
          .limit(1),
      );
    },

    async create(values: LocationInsert) {
      return first(await database.insert(schema.locations).values(values).returning());
    },

    async update(locationId: string, householdId: string, values: Partial<LocationInsert>) {
      return first(
        await database
          .update(schema.locations)
          .set(values)
          .where(
            and(
              eq(schema.locations.id, locationId),
              eq(schema.locations.householdId, householdId),
            ),
          )
          .returning(),
      );
    },

    async remove(locationId: string, householdId: string) {
      return first(
        await database
          .delete(schema.locations)
          .where(
            and(
              eq(schema.locations.id, locationId),
              eq(schema.locations.householdId, householdId),
            ),
          )
          .returning({ id: schema.locations.id }),
      );
    },
  };

  const storageSpots = {
    async listByHousehold(householdId: string) {
      return database
        .select()
        .from(schema.storageSpots)
        .where(eq(schema.storageSpots.householdId, householdId))
        .orderBy(asc(schema.storageSpots.sortOrder), asc(schema.storageSpots.name));
    },

    async findByIdInHousehold(storageSpotId: string, householdId: string) {
      return first(
        await database
          .select()
          .from(schema.storageSpots)
          .where(
            and(
              eq(schema.storageSpots.id, storageSpotId),
              eq(schema.storageSpots.householdId, householdId),
            ),
          )
          .limit(1),
      );
    },

    async findByQrToken(qrToken: string, householdId?: string) {
      const conditions = [eq(schema.storageSpots.qrToken, qrToken)];
      if (householdId) conditions.push(eq(schema.storageSpots.householdId, householdId));
      return first(await database.select().from(schema.storageSpots).where(and(...conditions)).limit(1));
    },

    async create(values: StorageSpotInsert) {
      return first(await database.insert(schema.storageSpots).values(values).returning());
    },

    async update(storageSpotId: string, householdId: string, values: Partial<StorageSpotInsert>) {
      return first(
        await database
          .update(schema.storageSpots)
          .set(values)
          .where(
            and(
              eq(schema.storageSpots.id, storageSpotId),
              eq(schema.storageSpots.householdId, householdId),
            ),
          )
          .returning(),
      );
    },

    async remove(storageSpotId: string, householdId: string) {
      return first(
        await database
          .delete(schema.storageSpots)
          .where(
            and(
              eq(schema.storageSpots.id, storageSpotId),
              eq(schema.storageSpots.householdId, householdId),
            ),
          )
          .returning({ id: schema.storageSpots.id }),
      );
    },
  };

  const items = {
    async findById(itemId: string, householdId?: string) {
      const conditions = [eq(schema.items.id, itemId)];
      if (householdId) conditions.push(eq(schema.items.householdId, householdId));
      return first(await database.select().from(schema.items).where(and(...conditions)).limit(1));
    },

    async findActiveByQrToken(qrToken: string, householdId?: string) {
      const conditions = [eq(schema.items.qrToken, qrToken), isNull(schema.items.deletedAt)];
      if (householdId) conditions.push(eq(schema.items.householdId, householdId));
      return first(await database.select().from(schema.items).where(and(...conditions)).limit(1));
    },

    async listByHousehold(householdId: string, filters: ItemListFilters = {}) {
      const conditions = itemConditions(householdId, filters);
      const orderColumn =
        filters.sort === 'createdAt'
          ? schema.items.createdAt
          : filters.sort === 'updatedAt'
            ? schema.items.updatedAt
            : schema.items.name;
      const orderExpression = filters.order === 'desc' ? desc(orderColumn) : asc(orderColumn);
      const where = and(...conditions);

      const [itemsResult, totalResult] = await Promise.all([
        database
          .select()
          .from(schema.items)
          .where(where)
          .orderBy(orderExpression)
          .limit(filters.limit ?? 50)
          .offset(filters.offset ?? 0),
        database.select({ count: count() }).from(schema.items).where(where),
      ]);

      return { items: itemsResult, total: Number(totalResult[0]?.count ?? 0) };
    },

    async listByIds(itemIds: string[], householdId: string) {
      if (itemIds.length === 0) return [];
      return database
        .select()
        .from(schema.items)
        .where(
          and(
            eq(schema.items.householdId, householdId),
            inArray(schema.items.id, itemIds),
            isNull(schema.items.deletedAt),
          ),
        );
    },

    async create(values: ItemInsert) {
      return first(await database.insert(schema.items).values(values).returning());
    },

    async update(itemId: string, householdId: string, values: Partial<ItemInsert>) {
      return first(
        await database
          .update(schema.items)
          .set({ ...values, updatedAt: new Date() })
          .where(
            and(eq(schema.items.id, itemId), eq(schema.items.householdId, householdId)),
          )
          .returning(),
      );
    },

    async softDelete(itemId: string, householdId: string) {
      return first(
        await database
          .update(schema.items)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(schema.items.id, itemId),
              eq(schema.items.householdId, householdId),
              isNull(schema.items.deletedAt),
            ),
          )
          .returning(),
      );
    },

    async restore(itemId: string, householdId: string) {
      return first(
        await database
          .update(schema.items)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(
            and(
              eq(schema.items.id, itemId),
              eq(schema.items.householdId, householdId),
              sql`${schema.items.deletedAt} IS NOT NULL`,
            ),
          )
          .returning(),
      );
    },

    async countByStatus(householdId: string) {
      return database
        .select({ status: schema.items.status, count: count() })
        .from(schema.items)
        .where(and(...householdConditions(householdId)))
        .groupBy(schema.items.status);
    },
  };

  const attachments = {
    async findById(attachmentId: string) {
      return first(
        await database
          .select()
          .from(schema.attachments)
          .where(eq(schema.attachments.id, attachmentId))
          .limit(1),
      );
    },

    async listByItem(itemId: string) {
      return database
        .select()
        .from(schema.attachments)
        .where(eq(schema.attachments.itemId, itemId))
        .orderBy(desc(schema.attachments.createdAt));
    },

    async countByItem(itemId: string) {
      const result = await database
        .select({ count: count() })
        .from(schema.attachments)
        .where(eq(schema.attachments.itemId, itemId));
      return Number(result[0]?.count ?? 0);
    },

    async create(values: AttachmentInsert) {
      return first(await database.insert(schema.attachments).values(values).returning());
    },

    async remove(attachmentId: string, itemId: string) {
      return first(
        await database
          .delete(schema.attachments)
          .where(
            and(
              eq(schema.attachments.id, attachmentId),
              eq(schema.attachments.itemId, itemId),
            ),
          )
          .returning({ id: schema.attachments.id }),
      );
    },
  };

  const activities = {
    async listByItem(itemId: string, limit = 50) {
      return database
        .select()
        .from(schema.itemActivities)
        .where(eq(schema.itemActivities.itemId, itemId))
        .orderBy(desc(schema.itemActivities.createdAt))
        .limit(limit);
    },

    async listByItemWithUsers(itemId: string, limit = 50) {
      return database
        .select({ activity: schema.itemActivities, user: schema.users })
        .from(schema.itemActivities)
        .innerJoin(schema.users, eq(schema.itemActivities.userId, schema.users.id))
        .where(eq(schema.itemActivities.itemId, itemId))
        .orderBy(desc(schema.itemActivities.createdAt))
        .limit(limit);
    },

    async create(values: ActivityInsert) {
      return first(await database.insert(schema.itemActivities).values(values).returning());
    },
  };

  const borrowRecords = {
    async findActiveForItem(itemId: string, householdId: string) {
      return first(
        await database
          .select()
          .from(schema.borrowRecords)
          .where(
            and(
              eq(schema.borrowRecords.itemId, itemId),
              eq(schema.borrowRecords.householdId, householdId),
              isNull(schema.borrowRecords.returnedAt),
            ),
          )
          .limit(1),
      );
    },

    async listByItem(itemId: string, householdId: string) {
      return database
        .select()
        .from(schema.borrowRecords)
        .where(
          and(
            eq(schema.borrowRecords.itemId, itemId),
            eq(schema.borrowRecords.householdId, householdId),
          ),
        )
        .orderBy(desc(schema.borrowRecords.borrowedAt));
    },

    async create(values: BorrowRecordInsert) {
      return first(await database.insert(schema.borrowRecords).values(values).returning());
    },

    async findById(recordId: string) {
      return first(
        await database
          .select()
          .from(schema.borrowRecords)
          .where(eq(schema.borrowRecords.id, recordId))
          .limit(1),
      );
    },

    async listReturnedSince(householdId: string, since: Date, limit = 5) {
      return database
        .select()
        .from(schema.borrowRecords)
        .where(
          and(
            eq(schema.borrowRecords.householdId, householdId),
            sql`${schema.borrowRecords.returnedAt} IS NOT NULL`,
            sql`${schema.borrowRecords.returnedAt} >= ${since}`,
          ),
        )
        .orderBy(desc(schema.borrowRecords.returnedAt))
        .limit(limit);
    },

    async listOverdue(now: Date) {
      return database
        .select({ record: schema.borrowRecords, item: schema.items })
        .from(schema.borrowRecords)
        .innerJoin(schema.items, eq(schema.borrowRecords.itemId, schema.items.id))
        .where(
          and(
            isNull(schema.borrowRecords.returnedAt),
            sql`${schema.borrowRecords.dueAt} IS NOT NULL`,
            sql`${schema.borrowRecords.dueAt} < ${now}`,
          ),
        );
    },

    async removeById(recordId: string) {
      return first(
        await database
          .delete(schema.borrowRecords)
          .where(eq(schema.borrowRecords.id, recordId))
          .returning({ id: schema.borrowRecords.id }),
      );
    },

    async closeActive(itemId: string, householdId: string, returnedAt = new Date()) {
      return first(
        await database
          .update(schema.borrowRecords)
          .set({ returnedAt })
          .where(
            and(
              eq(schema.borrowRecords.itemId, itemId),
              eq(schema.borrowRecords.householdId, householdId),
              isNull(schema.borrowRecords.returnedAt),
            ),
          )
          .returning(),
      );
    },

    async reopen(recordId: string) {
      return first(
        await database
          .update(schema.borrowRecords)
          .set({ returnedAt: null })
          .where(eq(schema.borrowRecords.id, recordId))
          .returning(),
      );
    },

    async remove(recordId: string, householdId: string) {
      return first(
        await database
          .delete(schema.borrowRecords)
          .where(
            and(
              eq(schema.borrowRecords.id, recordId),
              eq(schema.borrowRecords.householdId, householdId),
            ),
          )
          .returning({ id: schema.borrowRecords.id }),
      );
    },
  };

  const notifications = {
    async listForUser(userId: string, limit: number, offset: number, unreadOnly = false) {
      const conditions = [eq(schema.notifications.userId, userId)];
      if (unreadOnly) conditions.push(isNull(schema.notifications.readAt));
      const where = and(...conditions);
      const [rows, totalRows] = await Promise.all([
        database
          .select()
          .from(schema.notifications)
          .where(where)
          .orderBy(desc(schema.notifications.createdAt))
          .limit(limit)
          .offset(offset),
        database.select({ count: count() }).from(schema.notifications).where(where),
      ]);
      return { rows, total: Number(totalRows[0]?.count ?? 0) };
    },

    async markRead(notificationId: string, userId: string) {
      return first(
        await database
          .update(schema.notifications)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.userId, userId),
            ),
          )
          .returning(),
      );
    },

    async create(values: NotificationInsert | NotificationInsert[]) {
      const insert = database.insert(schema.notifications);
      const rows = Array.isArray(values)
        ? await insert.values(values).returning()
        : await insert.values(values).returning();
      return rows;
    },

    async existsOverdue(userId: string, itemId: string, borrowRecordId: string) {
      const rows = await database
        .select({ id: schema.notifications.id })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, userId),
            eq(schema.notifications.itemId, itemId),
            eq(schema.notifications.notificationType, 'return_overdue'),
            sql`json_extract(${schema.notifications.data}, '$.borrowRecordId') = ${borrowRecordId}`,
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    async removeOverdue(itemId: string, borrowRecordId: string) {
      return database
        .delete(schema.notifications)
        .where(
          and(
            eq(schema.notifications.itemId, itemId),
            eq(schema.notifications.notificationType, 'return_overdue'),
            sql`json_extract(${schema.notifications.data}, '$.borrowRecordId') = ${borrowRecordId}`,
          ),
        )
        .returning({ id: schema.notifications.id });
    },
  };

  const notificationPreferences = {
    async listByUserIds(userIds: string[]) {
      if (userIds.length === 0) return [];
      return database
        .select()
        .from(schema.notificationPreferences)
        .where(inArray(schema.notificationPreferences.userId, userIds));
    },

    async upsert(values: NotificationPreferenceInsert) {
      return first(
        await database
          .insert(schema.notificationPreferences)
          .values(values)
          .onConflictDoUpdate({
            target: schema.notificationPreferences.userId,
            set: {
              dueSoonEnabled: values.dueSoonEnabled,
              overdueEnabled: values.overdueEnabled,
              returnsEnabled: values.returnsEnabled,
              itemUpdatesEnabled: values.itemUpdatesEnabled,
              householdActivityEnabled: values.householdActivityEnabled,
              weeklySummaryEnabled: values.weeklySummaryEnabled,
              pauseAll: values.pauseAll,
              updatedAt: new Date(),
            },
          })
          .returning(),
      );
    },
  };

  return {
    users,
    households,
    memberships,
    categories,
    locations,
    storageSpots,
    items,
    attachments,
    activities,
    borrowRecords,
    notifications,
    notificationPreferences,
  };
}

export const inventoryRepositories = createInventoryRepositories();
