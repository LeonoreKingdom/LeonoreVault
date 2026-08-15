/**
 * Checkout and return history for an inventory item.
 * An open loan has a null `returned_at` value.
 */
export interface BorrowRecord {
  id: string;
  item_id: string;
  household_id: string;
  borrowed_by: string;
  borrowed_at: string;
  returned_at: string | null;
  due_at: string | null;
  note: string | null;
}

/** Payload for recording a new item checkout. */
export interface CreateBorrowRecordPayload {
  item_id: string;
  household_id: string;
  borrowed_by: string;
  due_at?: string | null;
  note?: string | null;
}
