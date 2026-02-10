-- ============================================================
-- 03_memberships.sql
-- ============================================================

CREATE TABLE public.memberships (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member',
  joined_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT memberships_user_household_unique UNIQUE (user_id, household_id),
  CONSTRAINT memberships_role_valid CHECK (role IN ('admin', 'member', 'viewer'))
);

CREATE INDEX idx_memberships_household ON public.memberships (household_id);
CREATE INDEX idx_memberships_user ON public.memberships (user_id);

COMMENT ON TABLE  public.memberships IS 'Junction table: users ↔ households with role';
COMMENT ON COLUMN public.memberships.role IS 'admin > member > viewer';
