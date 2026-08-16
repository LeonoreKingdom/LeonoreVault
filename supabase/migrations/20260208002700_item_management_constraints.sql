-- ============================================================
-- 27_item_management_constraints.sql
-- Keep item tag storage aligned with the shared validation contract.
-- ============================================================

-- Older rows may have been written without tags. Normalize them before
-- making the column required for new and existing item records.
UPDATE public.items
SET tags = '{}'
WHERE tags IS NULL;

ALTER TABLE public.items
  ALTER COLUMN tags SET DEFAULT '{}',
  ALTER COLUMN tags SET NOT NULL;

-- The original items migration already limits the array to 20 entries. This
-- function adds the per-tag 1..50 character rule enforced by Zod as well.
CREATE OR REPLACE FUNCTION public.item_tags_valid(tag_values text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT tag_values IS NOT NULL
    AND cardinality(tag_values) <= 20
    AND COALESCE(
      (
        SELECT bool_and(tag_value IS NOT NULL AND char_length(tag_value) BETWEEN 1 AND 50)
        FROM unnest(tag_values) AS tags(tag_value)
      ),
      true
    );
$$;

ALTER TABLE public.items
  ADD CONSTRAINT items_tags_format
  CHECK (public.item_tags_valid(tags))
  NOT VALID;

-- NOT VALID avoids rewriting or silently changing legacy non-conforming tags;
-- new writes are checked immediately and the constraint can be validated after
-- an explicit data-quality review.

COMMENT ON COLUMN public.items.tags IS
  'Array of 1..50 character tags; max 20 entries';
