-- ============================================================
-- 10_triggers.sql
-- updated_at auto-update, category/location depth enforcement,
-- and attachment count limit
-- ============================================================

-- ─── Auto-Update updated_at ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Category Max Depth Enforcement ─────────────────────────

CREATE OR REPLACE FUNCTION public.check_category_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth int := 0;
  current_parent uuid := NEW.parent_id;
BEGIN
  -- Walk up the parent chain
  WHILE current_parent IS NOT NULL LOOP
    depth := depth + 1;
    IF depth > 2 THEN  -- 0-indexed: root=0, child=1, grandchild=2
      RAISE EXCEPTION 'Maximum nesting depth of 3 exceeded for categories'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT parent_id INTO current_parent
      FROM public.categories
      WHERE id = current_parent;
  END LOOP;

  -- Also check downward: ensure children won't exceed depth
  IF TG_OP = 'UPDATE' AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    DECLARE
      max_child_depth int;
    BEGIN
      WITH RECURSIVE descendants AS (
        SELECT id, 0 AS lvl FROM public.categories WHERE parent_id = NEW.id
        UNION ALL
        SELECT c.id, d.lvl + 1
          FROM public.categories c
          JOIN descendants d ON c.parent_id = d.id
      )
      SELECT COALESCE(MAX(lvl), -1) INTO max_child_depth FROM descendants;

      IF (depth + 1 + max_child_depth + 1) > 3 THEN
        RAISE EXCEPTION 'Moving this category would exceed max depth of 3'
          USING ERRCODE = 'check_violation';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_depth
  BEFORE INSERT OR UPDATE OF parent_id ON public.categories
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION public.check_category_depth();

-- ─── Location Max Depth Enforcement ─────────────────────────

CREATE OR REPLACE FUNCTION public.check_location_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth int := 0;
  current_parent uuid := NEW.parent_id;
BEGIN
  WHILE current_parent IS NOT NULL LOOP
    depth := depth + 1;
    IF depth > 2 THEN
      RAISE EXCEPTION 'Maximum nesting depth of 3 exceeded for locations'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT parent_id INTO current_parent
      FROM public.locations
      WHERE id = current_parent;
  END LOOP;

  IF TG_OP = 'UPDATE' AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    DECLARE
      max_child_depth int;
    BEGIN
      WITH RECURSIVE descendants AS (
        SELECT id, 0 AS lvl FROM public.locations WHERE parent_id = NEW.id
        UNION ALL
        SELECT l.id, d.lvl + 1
          FROM public.locations l
          JOIN descendants d ON l.parent_id = d.id
      )
      SELECT COALESCE(MAX(lvl), -1) INTO max_child_depth FROM descendants;

      IF (depth + 1 + max_child_depth + 1) > 3 THEN
        RAISE EXCEPTION 'Moving this location would exceed max depth of 3'
          USING ERRCODE = 'check_violation';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_depth
  BEFORE INSERT OR UPDATE OF parent_id ON public.locations
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION public.check_location_depth();

-- ─── Attachment Count Enforcement ───────────────────────────

CREATE OR REPLACE FUNCTION public.check_attachment_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count int;
BEGIN
  SELECT COUNT(*) INTO current_count
    FROM public.attachments
    WHERE item_id = NEW.item_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 attachments per item exceeded'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attachments_limit
  BEFORE INSERT ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.check_attachment_limit();
