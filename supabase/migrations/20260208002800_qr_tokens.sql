-- ============================================================
-- 28_qr_tokens.sql
-- Stable, non-sequential QR identifiers for items and storage spots.
-- ============================================================

ALTER TABLE public.items
  ADD COLUMN qr_token text NOT NULL
    DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.items
  ADD CONSTRAINT items_qr_token_format
  CHECK (qr_token ~ '^[0-9a-f]{32}$');

CREATE UNIQUE INDEX items_qr_token_unique
  ON public.items (qr_token);

ALTER TABLE public.storage_spots
  ADD COLUMN qr_token text NOT NULL
    DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.storage_spots
  ADD CONSTRAINT storage_spots_qr_token_format
  CHECK (qr_token ~ '^[0-9a-f]{32}$');

CREATE UNIQUE INDEX storage_spots_qr_token_unique
  ON public.storage_spots (qr_token);

COMMENT ON COLUMN public.items.qr_token IS
  'Stable opaque token encoded into item QR labels; do not expose sequential IDs';
COMMENT ON COLUMN public.storage_spots.qr_token IS
  'Stable opaque token encoded into storage-spot QR labels; do not expose sequential IDs';
