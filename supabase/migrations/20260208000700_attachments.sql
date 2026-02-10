-- ============================================================
-- 07_attachments.sql
-- ============================================================

CREATE TABLE public.attachments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  drive_file_id text        NOT NULL,
  file_name     text        NOT NULL,
  mime_type     text        NOT NULL,
  thumbnail_url text,
  web_view_link text,
  created_by    uuid        NOT NULL REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT attachments_file_name_length CHECK (char_length(file_name) BETWEEN 1 AND 255),
  CONSTRAINT attachments_mime_type_valid CHECK (
    mime_type IN (
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.google-apps.document'
    )
  )
);

CREATE INDEX idx_attachments_item ON public.attachments (item_id);

COMMENT ON TABLE  public.attachments IS 'Files stored in Google Drive, linked to items';
COMMENT ON COLUMN public.attachments.drive_file_id IS 'Google Drive file ID or external URL identifier';
