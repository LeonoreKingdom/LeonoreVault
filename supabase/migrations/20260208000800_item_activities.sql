-- ============================================================
-- 08_item_activities.sql
-- ============================================================

CREATE TABLE public.item_activities (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.users(id),
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT activities_action_valid CHECK (
    action IN (
      'created',
      'updated',
      'moved',
      'status_changed',
      'attachment_added',
      'attachment_removed'
    )
  )
);

CREATE INDEX idx_activities_item_time ON public.item_activities (item_id, created_at DESC);
CREATE INDEX idx_activities_user ON public.item_activities (user_id);

COMMENT ON TABLE  public.item_activities IS 'Audit log for item changes';
COMMENT ON COLUMN public.item_activities.details IS 'JSON payload: {"old_status":"stored","new_status":"lost"} etc.';
