-- Notification inbox entries are materialized per user so read state is
-- independent for every household member.
CREATE TABLE public.notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  household_id      uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  item_id           uuid REFERENCES public.items(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  title             text NOT NULL,
  body              text,
  data              jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_type_valid CHECK (
    notification_type IN (
      'return_due_soon',
      'return_overdue',
      'item_returned',
      'item_updated',
      'household_activity'
    )
  ),
  CONSTRAINT notifications_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT notifications_body_length CHECK (
    body IS NULL OR char_length(body) <= 2000
  )
);

CREATE INDEX idx_notifications_user_created_at
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_household
  ON public.notifications (household_id, created_at DESC);

COMMENT ON TABLE public.notifications IS
  'Per-user notification inbox entries for household activity and return reminders';
COMMENT ON COLUMN public.notifications.data IS
  'Structured context for rendering and deep links, such as item_id or borrower details';
COMMENT ON COLUMN public.notifications.read_at IS
  'NULL while unread; set when the recipient acknowledges the notification';

CREATE TABLE public.notification_preferences (
  user_id                  uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  due_soon_enabled         boolean NOT NULL DEFAULT true,
  overdue_enabled          boolean NOT NULL DEFAULT true,
  returns_enabled          boolean NOT NULL DEFAULT true,
  item_updates_enabled     boolean NOT NULL DEFAULT false,
  household_activity_enabled boolean NOT NULL DEFAULT true,
  weekly_summary_enabled   boolean NOT NULL DEFAULT false,
  pause_all                boolean NOT NULL DEFAULT false,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.notification_preferences IS
  'Per-user controls for return reminders and household activity notifications';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    AND public.is_household_member(household_id)
  );

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    AND public.is_household_member(household_id)
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND public.is_household_member(household_id)
  );

CREATE POLICY notification_preferences_select_own
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY notification_preferences_insert_own
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY notification_preferences_update_own
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
