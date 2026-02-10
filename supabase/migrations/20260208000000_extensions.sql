-- ============================================================
-- 00_extensions.sql
-- Required PostgreSQL extensions for LeonoreVault
-- ============================================================

-- UUID generation (v4)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search (built-in, but ensure pg_trgm for fuzzy)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
