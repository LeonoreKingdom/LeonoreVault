# CONTEXT-MASTER.md

**Project:** LeonoreVault
**Last Updated:** 2026-08-17

---

## Quick Summary

LeonoreVault is a household inventory and management system for tracking physical assets, valuables, and important documents across multiple properties. It supports hierarchical organization, Cloudflare R2 attachments, QR code labeling, and offline-first capabilities for uninterrupted access in secure locations.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand
- **Backend:** Next.js 16 App Router route handlers on Vercel, with an internal Express.js 5 compatibility adapter for unmigrated modules
- **Database:** Turso (libSQL/SQLite) with Drizzle ORM, Dexie.js (offline cache)
- **Auth:** Better Auth with email/password and optional Google OAuth
- **Object Storage:** Cloudflare R2 via the S3-compatible API
- **Edge Security:** Cloudflare WAF/rate limiting for MyKisah media and Leonore Vault critical endpoints
- **Architecture:** Monorepo (pnpm workspaces), Offline-First Sync Engine

## Core Features (MVP)

1. **Asset Tracking:** Detailed inventory management with rich metadata, photos, and status tracking (stored/borrowed/lost).
2. **Smart Organization:** Nested categories and locations (up to 3 levels) with drag-and-drop management.
3. **Secure Attachments:** Cloudflare R2 storage for receipts, appraisals, and warranties.
4. **QR Labeling:** Generation of QR codes for physical item tagging and instant lookup.
5. **Offline Sync:** Robust offline read/write support with background conflict resolution and sync.

## Key Data Models

- **User:** `id`, `email`, `display_name`, `avatar_url`
- **Household:** `id`, `name`, `invite_code`
- **Item:** `id`, `name`, `category_id`, `location_id`, `status`
- **Category:** `id`, `name`, `parent_id`, `icon`
- **Location:** `id`, `name`, `parent_id`, `description`
- **Attachment:** `id`, `item_id`, `bucket`, `object_key`, `web_view_link`

## Main API Endpoints

- `POST /api/auth/sign-in/social` - Better Auth Google OAuth initiation
- `GET /items` - Paginated list of inventory items with filters
- `GET /categories/tree` - Hierarchical view of categories
- `POST /households` - Create new household scope
- `POST /sync` - Process offline mutation queue

## Current Progress

- [x] Phase 1-6: Planning & Requirements (Completed)
- [x] Phase 7: Database Design & Schema (Completed)
- [x] Phase 8: Task Backlog & Sizing (Completed)
- [ ] Phase 9: Development Sprint 1 (Not Started)

## Current Sprint Tasks (Sprint 1: Foundation)

- [x] **TASK-001:** Monorepo & Workspace Initialization ✅
- [x] **TASK-002:** Shared Types & Validators ✅
- [x] **TASK-003:** Database Setup & Migrations ✅
- [x] **TASK-004:** Backend Boilerplate & Env Config ✅
- [x] **TASK-005:** Google OAuth Implementation ✅
- [x] **TASK-006:** Frontend Auth & App Shell ✅
- [x] **TASK-007:** Household & Invite API ✅
- [x] **TASK-008:** Categories & Locations Tree API ✅
- [x] **TASK-009:** Item CRUD Endpoints ✅
- [ ] **TASK-010:** Inventory UI (List & Detail) ← NEXT

## Key Decisions Made

1. **Vercel-native API entrypoint:** Next.js route handlers own the production and local `/api` entrypoint. Express is retained only as an internal compatibility adapter and never starts its own listener.
2. **Turso + R2:** Turso is the production SQLite-compatible database and R2 is the production object store; Google is used only as an optional OAuth provider.
3. **pnpm Workspaces:** Enforcing clean separation of concerns between `web`, `api`, and `shared` packages.
4. **Offline-First:** Prioritizing local-first interaction using Dexie.js to ensure speed and availability in connection-limited environments (e.g., basements, vaults).

## Open Questions

- [ ] Handling of very large file uploads via the Service Account proxy vs. direct signed URLs.
- [ ] Optimization strategies for the deep recursive queries needed for the category tree on large datasets.

---

## Links to Full Docs

- **PRD:** `.ai-docs/02-prd.md`
- **TSD:** `.ai-docs/05-tsd.md` (Technical Specs)
- **API Spec:** `.ai-docs/06-api-specification.md`
- **DB Schema:** `.ai-docs/07-db-schema.md`
- **Task Backlog:** `.ai-docs/08-task-backlog.md`
