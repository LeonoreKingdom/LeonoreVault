-- ============================================================
-- 04_categories.sql
-- ============================================================

CREATE TABLE public.categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  parent_id    uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  icon         text,
  color        text,
  sort_order   int4 NOT NULL DEFAULT 0,

  CONSTRAINT categories_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT categories_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT categories_no_self_parent CHECK (id != parent_id)
);

-- Unique name within same parent scope of a household
CREATE UNIQUE INDEX categories_unique_name
  ON public.categories (household_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), name);

CREATE INDEX idx_categories_household ON public.categories (household_id);
CREATE INDEX idx_categories_parent ON public.categories (parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON TABLE  public.categories IS 'Hierarchical item categories (max depth 3)';
COMMENT ON COLUMN public.categories.parent_id IS 'Self-referencing FK; NULL = root category';
