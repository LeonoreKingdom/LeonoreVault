# CONTEXT-MASTER.md

**Project:** LeonoreVault
**Last Updated:** 2026-02-08

---

## Quick Summary

LeonoreVault is a comprehensive household inventory and management system designed for high-net-worth individuals to track physical assets, valuables, and important documents across multiple properties. It supports deep hierarchical organization, Google Drive integration for secure attachments, QR code labeling, and offline-first capabilities for uninterrupted access in secure locations.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 4, Zustand
- **Backend:** Express.js 5, Node.js, TypeScript
- **Database:** Supabase (PostgreSQL 15), Dexie.js (Offline)
- **Auth:** Supabase Auth (Google OAuth + PKCE)
- **External Services:** Google Drive API v3 (Storage)
- **Architecture:** Monorepo (pnpm workspaces), Offline-First Sync Engine

## Core Features (MVP)

1. **Asset Tracking:** Detailed inventory management with rich metadata, photos, and status tracking (stored/borrowed/lost).
2. **Smart Organization:** Nested categories and locations (up to 3 levels) with drag-and-drop management.
3. **Secure Attachments:** Integration with Google Drive for storing receipts, appraisals, and warranties.
4. **QR Labeling:** Generation of QR codes for physical item tagging and instant lookup.
5. **Offline Sync:** Robust offline read/write support with background conflict resolution and sync.

## Key Data Models

- **User:** `id`, `email`, `display_name`, `avatar_url`
- **Household:** `id`, `name`, `invite_code`, `drive_folder_id`
- **Item:** `id`, `name`, `category_id`, `location_id`, `status`
- **Category:** `id`, `name`, `parent_id`, `icon`
- **Location:** `id`, `name`, `parent_id`, `description`
- **Attachment:** `id`, `item_id`, `drive_file_id`, `web_view_link`

## Main API Endpoints

- `POST /auth/google/callback` - Handling Google OAuth and session creation
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
- [ ] **TASK-006:** Frontend Auth & App Shell ← NEXT

## Key Decisions Made

1. **Separate Express Backend:** Chosen over Next.js API routes to handle complex sync logic and long-running background tasks more effectively.
2. **Google Drive Storage:** Utilizing the user's existing Google ecosystem for file storage to minimize vendor lock-in and leverage existing storage plans.
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
