-- ============================================================
-- 01_users.sql
-- ============================================================

CREATE TABLE public.users (
  id                   uuid        PRIMARY KEY DEFAULT auth.uid(),
  email                text        NOT NULL,
  display_name         text,
  avatar_url           text,
  google_refresh_token text,       -- Encrypted via pgcrypto
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE  public.users IS 'Application users, synced from Supabase Auth';
COMMENT ON COLUMN public.users.id IS 'Matches auth.users.id from Supabase Auth';
COMMENT ON COLUMN public.users.google_refresh_token IS 'AES-encrypted Google OAuth refresh token; admin-only access';
