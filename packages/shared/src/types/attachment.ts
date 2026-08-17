/** Attachment metadata stored in Cloudflare R2 or an explicitly linked URL. */
export interface Attachment {
  id: string;
  item_id: string;
  bucket: string;
  object_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  thumbnail_key: string | null;
  thumbnail_url: string | null;
  web_view_link: string | null;
  created_by: string;
  created_at: string;
}
