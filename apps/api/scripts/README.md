# One-time migration scripts

These scripts import data and legacy attachments into the active Turso and
Cloudflare R2 services. They are operator tooling only; the application does
not import or call them at runtime.

Run them from the repository root with the required migration-only variables
in `.env`:

- `POSTGRES_BACKUP_PATH` for the exported database backup.
- `LEGACY_STORAGE_PUBLIC_URL` or `LEGACY_SUPABASE_URL` for the old public
  attachment endpoint.
- `LEGACY_STORAGE_BEARER_TOKEN` when the old storage endpoint is private.
- `LEGACY_STORAGE_EXPORT_DIR` when the storage export is available locally.
- `LEGACY_SUPABASE_PROJECT_REF` when object keys need project metadata.

The application runtime uses only `TURSO_*`, `BETTER_AUTH_*`, and `R2_*`
configuration. Remove the migration-only variables after the import is
verified.
