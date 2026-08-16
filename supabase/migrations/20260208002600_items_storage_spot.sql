-- ============================================================
-- 26_items_storage_spot.sql
-- ============================================================

-- Keep the legacy location_id relationship intact while allowing the newer
-- storage-organization tree to own item placement.
ALTER TABLE public.items
  ADD COLUMN storage_spot_id uuid;

ALTER TABLE public.items
  ADD CONSTRAINT items_storage_spot_same_household_fkey
  FOREIGN KEY (storage_spot_id, household_id)
  REFERENCES public.storage_spots (id, household_id)
  ON DELETE NO ACTION;

CREATE INDEX idx_items_storage_spot
  ON public.items (household_id, storage_spot_id)
  WHERE storage_spot_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.items.storage_spot_id IS
  'Optional storage-organization spot; legacy location_id remains supported';
