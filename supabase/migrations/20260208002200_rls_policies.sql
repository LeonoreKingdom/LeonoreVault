-- ============================================================
-- 22_rls_policies.sql
-- Row-Level Security policies for all tables
-- ============================================================

-- ─── Users ──────────────────────────────────────────────────

CREATE POLICY users_select_own
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── Households ─────────────────────────────────────────────

CREATE POLICY households_select_member
  ON public.households FOR SELECT
  USING (public.is_household_member(id));

CREATE POLICY households_insert_auth
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY households_update_admin
  ON public.households FOR UPDATE
  USING (public.is_household_admin(id))
  WITH CHECK (public.is_household_admin(id));

CREATE POLICY households_delete_admin
  ON public.households FOR DELETE
  USING (public.is_household_admin(id));

-- ─── Memberships ────────────────────────────────────────────

CREATE POLICY memberships_select_household
  ON public.memberships FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY memberships_insert
  ON public.memberships FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_household_admin(household_id)
  );

CREATE POLICY memberships_update_admin
  ON public.memberships FOR UPDATE
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

CREATE POLICY memberships_delete_admin
  ON public.memberships FOR DELETE
  USING (public.is_household_admin(household_id));

-- ─── Categories ─────────────────────────────────────────────

CREATE POLICY categories_select_member
  ON public.categories FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY categories_insert_admin
  ON public.categories FOR INSERT
  WITH CHECK (public.is_household_admin(household_id));

CREATE POLICY categories_update_admin
  ON public.categories FOR UPDATE
  USING (public.is_household_admin(household_id));

CREATE POLICY categories_delete_admin
  ON public.categories FOR DELETE
  USING (public.is_household_admin(household_id));

-- ─── Locations ──────────────────────────────────────────────

CREATE POLICY locations_select_member
  ON public.locations FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY locations_insert_admin
  ON public.locations FOR INSERT
  WITH CHECK (public.is_household_admin(household_id));

CREATE POLICY locations_update_admin
  ON public.locations FOR UPDATE
  USING (public.is_household_admin(household_id));

CREATE POLICY locations_delete_admin
  ON public.locations FOR DELETE
  USING (public.is_household_admin(household_id));

-- ─── Items ──────────────────────────────────────────────────

CREATE POLICY items_select_member
  ON public.items FOR SELECT
  USING (
    public.is_household_member(household_id)
    AND deleted_at IS NULL
  );

CREATE POLICY items_insert_writer
  ON public.items FOR INSERT
  WITH CHECK (
    public.has_write_access(household_id)
    AND created_by = auth.uid()
  );

CREATE POLICY items_update_writer
  ON public.items FOR UPDATE
  USING (public.has_write_access(household_id));

CREATE POLICY items_delete_admin
  ON public.items FOR DELETE
  USING (public.is_household_admin(household_id));

-- ─── Attachments ────────────────────────────────────────────

CREATE POLICY attachments_select_member
  ON public.attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = attachments.item_id
        AND public.is_household_member(i.household_id)
    )
  );

CREATE POLICY attachments_insert_writer
  ON public.attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = attachments.item_id
        AND public.has_write_access(i.household_id)
    )
    AND created_by = auth.uid()
  );

CREATE POLICY attachments_delete_writer
  ON public.attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = attachments.item_id
        AND public.has_write_access(i.household_id)
    )
  );

-- ─── Item Activities ────────────────────────────────────────

CREATE POLICY activities_select_member
  ON public.item_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_activities.item_id
        AND public.is_household_member(i.household_id)
    )
  );

CREATE POLICY activities_insert_writer
  ON public.item_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_activities.item_id
        AND public.has_write_access(i.household_id)
    )
    AND user_id = auth.uid()
  );

-- No update or delete policies — activity log is append-only
