-- ============================================================
-- 09_borrow_records.sql
-- ============================================================

-- A borrow record is the history entry for an item's checkout.
-- The current checkout can be found by returned_at IS NULL.
CREATE TABLE public.borrow_records (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  borrowed_by  uuid        NOT NULL REFERENCES public.users(id),
  borrowed_at  timestamptz NOT NULL DEFAULT now(),
  returned_at  timestamptz,
  due_at       timestamptz,
  note         text,

  CONSTRAINT borrow_records_note_length CHECK (
    note IS NULL OR char_length(note) <= 1000
  ),
  CONSTRAINT borrow_records_dates_valid CHECK (
    (due_at IS NULL OR due_at >= borrowed_at)
    AND (returned_at IS NULL OR returned_at >= borrowed_at)
  )
);

-- Item history is ordered by the checkout timestamp.
CREATE INDEX idx_borrow_records_item_time
  ON public.borrow_records (item_id, borrowed_at DESC);

-- Active loans are the common household query and are used for due-date views.
CREATE INDEX idx_borrow_records_household_active
  ON public.borrow_records (household_id, due_at)
  WHERE returned_at IS NULL;

CREATE INDEX idx_borrow_records_borrower
  ON public.borrow_records (borrowed_by);

-- An item can have many historical loans but only one open loan at a time.
CREATE UNIQUE INDEX idx_borrow_records_one_active_per_item
  ON public.borrow_records (item_id)
  WHERE returned_at IS NULL;

COMMENT ON TABLE public.borrow_records IS
  'Checkout and return history for household inventory items';
COMMENT ON COLUMN public.borrow_records.returned_at IS
  'NULL while the item is checked out';
