import { z } from 'zod';
import { uuidSchema } from './user.schema.js';

/** Query parameters for the authenticated user's notification inbox. */
export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread_only: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default('false'),
});

/** Route parameters for a single notification. */
export const notificationIdParamSchema = z.object({
  id: uuidSchema,
});

/** Complete set of notification preferences saved for the authenticated user. */
export const notificationPreferenceSchema = z.object({
  due_soon_enabled: z.boolean(),
  overdue_enabled: z.boolean(),
  returns_enabled: z.boolean(),
  item_updates_enabled: z.boolean(),
  household_activity_enabled: z.boolean(),
  weekly_summary_enabled: z.boolean(),
  pause_all: z.boolean(),
});

export type NotificationListQuerySchema = z.infer<typeof notificationListQuerySchema>;
export type NotificationIdParamSchema = z.infer<typeof notificationIdParamSchema>;
export type NotificationPreferenceSchema = z.infer<typeof notificationPreferenceSchema>;
