-- A borrow record can produce at most one overdue reminder per recipient.
-- The partial predicate keeps other notification types independent.
CREATE UNIQUE INDEX notifications_overdue_recipient_dedup
  ON public.notifications (
    user_id,
    household_id,
    ((data ->> 'borrowRecordId'))
  )
  WHERE notification_type = 'return_overdue';
