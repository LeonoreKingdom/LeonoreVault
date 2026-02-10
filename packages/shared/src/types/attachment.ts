/**
 * Attachment entity — Google Drive file linked to an item.
 * Max 10 attachments per item (enforced at application level).
 */
export interface Attachment {
  id: string;
  item_id: string;
  drive_file_id: string;
  file_name: string;
  mime_type: string;
  thumbnail_url: string | null;
  web_view_link: string | null;
  created_by: string;
  created_at: string;
}
