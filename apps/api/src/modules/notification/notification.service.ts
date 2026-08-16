import type {
  NotificationListQuerySchema,
  NotificationPreferenceSchema,
  Json,
} from '@leonorevault/shared';
import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    householdId: row.household_id,
    itemId: row.item_id ?? null,
    notificationType: row.notification_type,
    title: row.title,
    body: row.body ?? null,
    data: row.data ?? {},
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

function mapNotificationPreferences(row: Record<string, unknown>) {
  return {
    userId: row.user_id,
    dueSoonEnabled: row.due_soon_enabled,
    overdueEnabled: row.overdue_enabled,
    returnsEnabled: row.returns_enabled,
    itemUpdatesEnabled: row.item_updates_enabled,
    householdActivityEnabled: row.household_activity_enabled,
    weeklySummaryEnabled: row.weekly_summary_enabled,
    pauseAll: row.pause_all,
    updatedAt: row.updated_at,
  };
}

/** List the authenticated user's newest notifications with optional unread filtering. */
export async function listNotifications(userId: string, query: NotificationListQuerySchema) {
  const { page, limit, unread_only: unreadOnly } = query;
  const offset = (page - 1) * limit;

  let request = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (unreadOnly) request = request.is('read_at', null);

  const { data, error, count } = await request
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({ error: error.message, userId }, 'Failed to list notifications');
    throw new AppError(500, 'Failed to fetch notifications', 'INTERNAL_ERROR');
  }

  return {
    notifications: (data ?? []).map((row) => mapNotification(row as Record<string, unknown>)),
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

/** Mark one notification as read, scoped to the authenticated recipient. */
export async function markNotificationRead(notificationId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error(
      { error: error.message, notificationId, userId },
      'Failed to mark notification as read',
    );
    throw new AppError(500, 'Failed to mark notification as read', 'INTERNAL_ERROR');
  }

  if (!data) {
    throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  return { notification: mapNotification(data as Record<string, unknown>) };
}

/** Save the authenticated user's complete notification preference set. */
export async function saveNotificationPreferences(
  userId: string,
  payload: NotificationPreferenceSchema,
) {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        ...payload,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    logger.error({ error: error.message, userId }, 'Failed to save notification preferences');
    throw new AppError(500, 'Failed to save notification preferences', 'INTERNAL_ERROR');
  }

  return { preferences: mapNotificationPreferences(data as Record<string, unknown>) };
}

/**
 * Fan out a return event to the other members of the household.
 * Notification delivery is best-effort so a notification write cannot undo a
 * successful item return.
 */
export async function createItemReturnedNotifications(input: {
  householdId: string;
  itemId: string;
  itemName: string;
  actorUserId: string;
  borrowedBy: string | null;
  note: string | null;
}) {
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('memberships')
    .select('user_id')
    .eq('household_id', input.householdId);

  if (membershipError) {
    logger.error(
      { error: membershipError.message, householdId: input.householdId, itemId: input.itemId },
      'Failed to find notification recipients for returned item',
    );
    return;
  }

  const recipientIds = (memberships ?? [])
    .map((membership) => membership.user_id)
    .filter((userId) => userId !== input.actorUserId);

  if (recipientIds.length === 0) return;

  const { error: notificationError } = await supabaseAdmin.from('notifications').insert(
    recipientIds.map((userId) => ({
      user_id: userId,
      household_id: input.householdId,
      item_id: input.itemId,
      notification_type: 'item_returned' as const,
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

  if (notificationError) {
    logger.error(
      { error: notificationError.message, householdId: input.householdId, itemId: input.itemId },
      'Failed to create returned item notifications',
    );
  }
}

/** Clear overdue reminders tied to a checkout after that checkout is returned. */
export async function clearOverdueNotifications(itemId: string, borrowRecordId: string) {
  if (!borrowRecordId) return;

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('item_id', itemId)
    .eq('notification_type', 'return_overdue')
    .contains('data', { borrowRecordId });

  if (error) {
    logger.error(
      { error: error.message, itemId, borrowRecordId },
      'Failed to clear overdue notifications after return',
    );
  }
}

/**
 * Create one overdue reminder per recipient for each active overdue borrow.
 * The database unique index is the final race-safe duplicate guard; a
 * duplicate insert is counted and ignored so the rest of the job can continue.
 */
export async function runOverdueReminderJob(now: Date = new Date()) {
  const { data: borrowRecords, error: borrowError } = await supabaseAdmin
    .from('borrow_records')
    .select('id, item_id, household_id, borrowed_by, due_at, items(name)')
    .is('returned_at', null)
    .not('due_at', 'is', null)
    .lt('due_at', now.toISOString());

  if (borrowError) {
    logger.error({ error: borrowError.message }, 'Failed to load overdue borrow records');
    return { overdueRecords: 0, notificationsCreated: 0, duplicatesSkipped: 0 };
  }

  let notificationsCreated = 0;
  let duplicatesSkipped = 0;

  for (const rawRecord of borrowRecords ?? []) {
    const record = rawRecord as Record<string, unknown>;
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('household_id', record.household_id as string);

    if (membershipError) {
      logger.error(
        { error: membershipError.message, householdId: record.household_id },
        'Failed to load overdue notification recipients',
      );
      continue;
    }

    const recipientIds = (memberships ?? []).map((membership) => membership.user_id);
    if (recipientIds.length === 0) continue;

    const { data: preferences, error: preferenceError } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, overdue_enabled, pause_all')
      .in('user_id', recipientIds);

    if (preferenceError) {
      logger.error(
        { error: preferenceError.message, householdId: record.household_id },
        'Failed to load overdue notification preferences',
      );
      continue;
    }

    const preferenceByUserId = new Map(
      (preferences ?? []).map((preference) => [preference.user_id, preference]),
    );
    const relatedItem = Array.isArray(record.items) ? record.items[0] : record.items;
    const itemName =
      relatedItem && typeof relatedItem === 'object'
        ? String((relatedItem as Record<string, unknown>).name ?? 'Item')
        : 'Item';

    for (const userId of recipientIds) {
      const preference = preferenceByUserId.get(userId);
      if (preference && (!preference.overdue_enabled || preference.pause_all)) continue;

      const { error: notificationError } = await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        household_id: record.household_id as string,
        item_id: record.item_id as string,
        notification_type: 'return_overdue',
        title: `${itemName} is overdue`,
        body: 'This item is overdue and needs to be returned.',
        data: {
          borrowRecordId: String(record.id),
          itemId: String(record.item_id),
          borrowedBy: record.borrowed_by === null ? null : String(record.borrowed_by),
          dueAt: String(record.due_at),
        } as Json,
      });

      if (notificationError?.code === '23505') {
        duplicatesSkipped += 1;
      } else if (notificationError) {
        logger.error(
          {
            error: notificationError.message,
            householdId: record.household_id,
            borrowRecordId: record.id,
            userId,
          },
          'Failed to create overdue notification',
        );
      } else {
        notificationsCreated += 1;
      }
    }
  }

  return {
    overdueRecords: borrowRecords?.length ?? 0,
    notificationsCreated,
    duplicatesSkipped,
  };
}
