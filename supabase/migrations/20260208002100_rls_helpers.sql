-- ============================================================
-- 21_rls_helpers.sql
-- Helper functions used by RLS policies
-- ============================================================

-- Check if current user is a member of the given household
CREATE OR REPLACE FUNCTION public.is_household_member(h_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND household_id = h_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current user's role in the given household
CREATE OR REPLACE FUNCTION public.get_household_role(h_id uuid)
RETURNS text AS $$
  SELECT role FROM public.memberships
  WHERE user_id = auth.uid()
    AND household_id = h_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user has write access (admin or member)
CREATE OR REPLACE FUNCTION public.has_write_access(h_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND household_id = h_id
      AND role IN ('admin', 'member')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is admin of the given household
CREATE OR REPLACE FUNCTION public.is_household_admin(h_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND household_id = h_id
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
