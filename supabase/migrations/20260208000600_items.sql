-- ============================================================
-- 06_items.sql
-- ============================================================

CREATE TABLE public.items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  category_id     uuid        REFERENCES public.categories(id) ON DELETE SET NULL,
  location_id     uuid        REFERENCES public.locations(id) ON DELETE SET NULL,
  quantity        int4        NOT NULL DEFAULT 1,
  tags            text[]      DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'stored',
  created_by      uuid        NOT NULL REFERENCES public.users(id),
  borrowed_by     uuid        REFERENCES public.users(id),
  borrow_due_date timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  CONSTRAINT items_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT items_desc_length CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT items_quantity_positive CHECK (quantity >= 1),
  CONSTRAINT items_tags_limit CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20),
  CONSTRAINT items_status_valid CHECK (status IN ('stored', 'borrowed', 'lost', 'in_lost_found')),
  CONSTRAINT items_borrow_consistency CHECK (
    (status = 'borrowed' AND borrowed_by IS NOT NULL) OR
    (status != 'borrowed' AND borrowed_by IS NULL AND borrow_due_date IS NULL)
  )
);

-- Primary query index
CREATE INDEX idx_items_household ON public.items (household_id);

-- Status filter
CREATE INDEX idx_items_household_status ON public.items (household_id, status)
  WHERE deleted_at IS NULL;

-- Full-text search on name
CREATE INDEX idx_items_name_fts ON public.items
  USING GIN (to_tsvector('english', name));

-- Trigram index for fuzzy/partial matching
CREATE INDEX idx_items_name_trgm ON public.items
  USING GIN (name gin_trgm_ops);

-- Soft-delete cleanup
CREATE INDEX idx_items_deleted ON public.items (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Created-by for activity queries
CREATE INDEX idx_items_created_by ON public.items (created_by);

COMMENT ON TABLE  public.items IS 'Core entity: household inventory items';
COMMENT ON COLUMN public.items.tags IS 'Array of string tags; max 20 entries, each ≤ 50 chars';
COMMENT ON COLUMN public.items.deleted_at IS 'Soft-delete; auto-purged after 30 days via pg_cron';
