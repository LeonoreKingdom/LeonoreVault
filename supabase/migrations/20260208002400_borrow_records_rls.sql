-- ============================================================
-- 24_borrow_records_rls.sql
-- Row-Level Security for borrow records
-- ============================================================

ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY borrow_records_select_member
  ON public.borrow_records FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY borrow_records_insert_writer
  ON public.borrow_records FOR INSERT
  WITH CHECK (
    public.has_write_access(household_id)
    AND EXISTS (
      SELECT 1
      FROM public.items
      WHERE items.id = borrow_records.item_id
        AND items.household_id = borrow_records.household_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE memberships.household_id = borrow_records.household_id
        AND memberships.user_id = borrow_records.borrowed_by
    )
  );

CREATE POLICY borrow_records_update_writer
  ON public.borrow_records FOR UPDATE
  USING (public.has_write_access(household_id))
  WITH CHECK (
    public.has_write_access(household_id)
    AND EXISTS (
      SELECT 1
      FROM public.items
      WHERE items.id = borrow_records.item_id
        AND items.household_id = borrow_records.household_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE memberships.household_id = borrow_records.household_id
        AND memberships.user_id = borrow_records.borrowed_by
    )
  );

CREATE POLICY borrow_records_delete_admin
  ON public.borrow_records FOR DELETE
  USING (public.is_household_admin(household_id));
