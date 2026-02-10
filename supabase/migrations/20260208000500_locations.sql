-- ============================================================
-- 05_locations.sql
-- ============================================================

CREATE TABLE public.locations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  parent_id    uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  description  text,
  sort_order   int4 NOT NULL DEFAULT 0,

  CONSTRAINT locations_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT locations_desc_length CHECK (description IS NULL OR char_length(description) <= 500),
  CONSTRAINT locations_no_self_parent CHECK (id != parent_id)
);

CREATE UNIQUE INDEX locations_unique_name
  ON public.locations (household_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), name);

CREATE INDEX idx_locations_household ON public.locations (household_id);
CREATE INDEX idx_locations_parent ON public.locations (parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON TABLE  public.locations IS 'Hierarchical storage locations (max depth 3)';
