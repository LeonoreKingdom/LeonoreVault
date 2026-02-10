-- ============================================================
-- 02_households.sql
-- ============================================================

CREATE TABLE public.households (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  created_by        uuid        NOT NULL REFERENCES public.users(id),
  invite_code       text,
  invite_expires_at timestamptz,
  drive_folder_id   text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT households_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT households_invite_code_format CHECK (
    invite_code IS NULL OR invite_code ~ '^[A-Z0-9]{6}$'
  ),
  CONSTRAINT households_invite_consistency CHECK (
    (invite_code IS NULL AND invite_expires_at IS NULL) OR
    (invite_code IS NOT NULL AND invite_expires_at IS NOT NULL)
  )
);

-- Partial unique index: only active invite codes must be unique
CREATE UNIQUE INDEX households_invite_code_unique
  ON public.households (invite_code)
  WHERE invite_code IS NOT NULL;

COMMENT ON TABLE  public.households IS 'Household groups that own items';
COMMENT ON COLUMN public.households.invite_code IS '6-char uppercase alphanumeric; NULL when no active invite';
COMMENT ON COLUMN public.households.drive_folder_id IS 'Google Drive root folder ID for household attachments';
