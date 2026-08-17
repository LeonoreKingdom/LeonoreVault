import type { NotificationListQuerySchema, NotificationPreferenceSchema } from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.userId,
    householdId: row.householdId,
    itemId: row.itemId ?? null,
    notificationType: row.notificationType,
    title: row.title,
    body: row.body ?? null,
    data: row.data ?? {},
    readAt: row.readAt ?? null,
    createdAt: row.createdAt,
  };
}

function mapNotificationPreferences(row: Record<string, unknown>) {
  return {
    userId: row.userId,
    dueSoonEnabled: row.dueSoonEnabled,
    overdueEnabled: row.overdueEnabled,
    returnsEnabled: row.returnsEnabled,
    itemUpdatesEnabled: row.itemUpdatesEnabled,
    householdActivityEnabled: row.householdActivityEnabled,
    weeklySummaryEnabled: row.weeklySummaryEnabled,
    pauseAll: row.pauseAll,
    updatedAt: row.updatedAt,
  };
}

export async function listNotifications(userId: string, query: NotificationListQuerySchema) {
  const offset = (query.page - 1) * query.limit;
  const repositories = await getInventoryRepositories();
  const { rows, total } = await repositories.notifications.listForUser(
    userId,
    query.limit,
    offset,
    query.unread_only,
  );
  return {
    notifications: rows.map((row) => mapNotification(row as unknown as Record<string, unknown>)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const repositories = await getInventoryRepositories();
  const row = await repositories.notifications.markRead(notificationId, userId);
  if (!row) throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  return { notification: mapNotification(row as unknown as Record<string, unknown>) };
}

export async function saveNotificationPreferences(
  userId: string,
  payload: NotificationPreferenceSchema,
) {
  const repositories = await getInventoryRepositories();
  const row = await repositories.notificationPreferences.upsert({
    userId,
    dueSoonEnabled: payload.due_soon_enabled,
    overdueEnabled: payload.overdue_enabled,
    returnsEnabled: payload.returns_enabled,
    itemUpdatesEnabled: payload.item_updates_enabled,
    householdActivityEnabled: payload.household_activity_enabled,
    weeklySummaryEnabled: payload.weekly_summary_enabled,
    pauseAll: payload.pause_all,
  });
  if (!row) throw new AppError(500, 'Failed to save notification preferences', 'INTERNAL_ERROR');
  return { preferences: mapNotificationPreferences(row as unknown as Record<string, unknown>) };
}

export async function createItemReturnedNotifications(input: {
  householdId: string;
  itemId: string;
  itemName: string;
  actorUserId: string;
  borrowedBy: string | null;
  note: string | null;
}) {
  try {
    const repositories = await getInventoryRepositories();
    const recipientIds = (await repositories.memberships.listByHousehold(input.householdId))
      .map(({ membership }) => membership.userId)
      .filter((userId) => userId !== input.actorUserId);
    if (recipientIds.length === 0) return;
    await repositories.notifications.create(
      recipientIds.map((userId) => ({
        userId,
        householdId: input.householdId,
        itemId: input.itemId,
        notificationType: 'item_returned' as const,
        title: `${input.itemName} was returned`,
        body: 'A household member marked this item as returned.',
        data: {
          itemId: input.itemId,
          returnedBy: input.actorUserId,
          borrowedBy: input.borrowedBy,
          note: input.note,
        },
      })),
    );
  } catch (err) {
    logger.error({ err, householdId: input.householdId, itemId: input.itemId }, 'Failed to create returned item notifications');
  }
}

export async function clearOverdueNotifications(itemId: string, borrowRecordId: string) {
  if (!borrowRecordId) return;
  try {
    const repositories = await getInventoryRepositories();
    await repositories.notifications.removeOverdue(itemId, borrowRecordId);
  } catch (err) {
    logger.error({ err, itemId, borrowRecordId }, 'Failed to clear overdue notifications after return');
  }
}

export async function runOverdueReminderJob(now: Date = new Date()) {
  const repositories = await getInventoryRepositories();
  const records = await repositories.borrowRecords.listOverdue(now);
  let notificationsCreated = 0;
  let duplicatesSkipped = 0;
  for (const { record, item } of records) {
    const recipients = await repositories.memberships.listByHousehold(record.householdId);
    const recipientIds = recipients.map(({ membership }) => membership.userId);
    const preferences = await repositories.notificationPreferences.listByUserIds(recipientIds);
    const preferenceByUserId = new Map(preferences.map((preference) => [preference.userId, preference]));
    for (const userId of recipientIds) {
      const preference = preferenceByUserId.get(userId);
      if (preference && (!preference.overdueEnabled || preference.pauseAll)) continue;
      const recordId = String(record.id);
      if (await repositories.notifications.existsOverdue(userId, record.itemId, recordId)) {
        duplicatesSkipped += 1;
        continue;
      }
      try {
        await repositories.notifications.create({
          userId,
          householdId: record.householdId,
          itemId: record.itemId,
          notificationType: 'return_overdue',
          title: `${item.name} is overdue`,
          body: 'This item is overdue and needs to be returned.',
          data: {
            borrowRecordId: recordId,
            itemId: String(record.itemId),
            borrowedBy: record.borrowedBy,
            dueAt: record.dueAt,
          },
        });
        notificationsCreated += 1;
      } catch (err) {
        logger.error({ err, userId, borrowRecordId: recordId }, 'Failed to create overdue notification');
      }
    }
  }
  return {
    overdueRecords: records.length,
    notificationsCreated,
    duplicatesSkipped,
  };
}
