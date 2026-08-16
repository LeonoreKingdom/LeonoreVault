-- ============================================================
-- 25_storage_spots.sql
-- ============================================================

-- Storage spots are the newer storage-organization entity. The existing
-- `locations` table remains intact for the current item API contract.
CREATE TABLE public.storage_spots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  parent_id    uuid,
  spot_type    text NOT NULL DEFAULT 'other',
  description  text,
  capacity     int4 NOT NULL DEFAULT 0,
  sort_order   int4 NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- The composite reference prevents a spot from pointing at a parent in a
  -- different household while retaining a self-referencing parent tree.
  CONSTRAINT storage_spots_id_household_unique UNIQUE (id, household_id),
  CONSTRAINT storage_spots_parent_same_household_fkey
    FOREIGN KEY (parent_id, household_id)
    REFERENCES public.storage_spots (id, household_id)
    ON DELETE CASCADE,
  CONSTRAINT storage_spots_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT storage_spots_description_length CHECK (
    description IS NULL OR char_length(description) <= 500
  ),
  CONSTRAINT storage_spots_type_valid CHECK (
    spot_type IN ('room', 'cabinet', 'shelf', 'drawer', 'box', 'other')
  ),
  CONSTRAINT storage_spots_capacity_non_negative CHECK (capacity >= 0),
  CONSTRAINT storage_spots_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT storage_spots_no_self_parent CHECK (id <> parent_id)
);

CREATE UNIQUE INDEX storage_spots_unique_name
  ON public.storage_spots (
    household_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'),
    name
  );

CREATE INDEX idx_storage_spots_household
  ON public.storage_spots (household_id);

CREATE INDEX idx_storage_spots_parent
  ON public.storage_spots (household_id, parent_id, sort_order)
  WHERE parent_id IS NOT NULL;

CREATE TRIGGER trg_storage_spots_updated_at
  BEFORE UPDATE ON public.storage_spots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.storage_spots IS
  'Hierarchical storage spots for the storage-organization experience';
COMMENT ON COLUMN public.storage_spots.parent_id IS
  'Self-referencing parent; NULL means the spot is a household root';
COMMENT ON COLUMN public.storage_spots.capacity IS
  'Optional item capacity; zero means capacity is not specified';
