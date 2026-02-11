# Development Task Backlog

**Project:** LeonoreVault
**Total Estimated Hours:** ~75 hours
**Last Updated:** 2026-02-08

---

## Overview

| Epic                       | Tasks | Est. Hours | Status |
| -------------------------- | ----- | ---------- | ------ |
| **Project Setup**          | 4     | 9h         | 🔄     |
| **Database**               | 3     | 6h         | ⬜     |
| **Authentication**         | 2     | 6h         | ⬜     |
| **Inventory Core**         | 5     | 18h        | ⬜     |
| **Households & Locations** | 3     | 10h        | ⬜     |
| **Integration (Drive/QR)** | 3     | 10h        | ⬜     |
| **Offline & Sync**         | 2     | 10h        | ⬜     |
| **Deployment**             | 2     | 6h         | ⬜     |

---

## Sprint 1: Foundation & Auth (Est: 25h)

### TASK-001: Monorepo & Workspace Initialization

**Epic:** Project Setup
**Priority:** P0
**Estimate:** 3h
**Dependencies:** None
**Status:** ✅

**Description:**
Initialize the pnpm workspace monorepo structure with `apps/web` (Next.js 15), `apps/api` (Express), and `packages/shared`. Configure ESLint, Prettier, and TypeScript base configs.

**Acceptance Criteria:**

- [ ] Root `pnpm-workspace.yaml` configured
- [ ] `packages/shared` initialized with TS config
- [ ] `apps/web` initialized (Next.js 15, Tailwind 4)
- [ ] `apps/api` initialized (Express, TypeScript)
- [ ] `pnpm build` works from root for all packages
- [ ] Linting/Formatting scripts operational

### TASK-002: Shared Types & Validators

**Epic:** Project Setup
**Priority:** P0
**Estimate:** 2h
**Dependencies:** TASK-001
**Status:** ✅

**Description:**
Implement shared TypeScript interfaces and Zod schemas in `packages/shared`. This ensures type safety across FE/BE boundaries.

**Acceptance Criteria:**

- [ ] Zod schemas created for: User, Household, Item, Category, Location
- [ ] TypeScript types exported from Zod schemas
- [ ] API Response types (`ApiResponse`, `ApiError`) defined
- [ ] Package exports configured correctly for consumption by apps

### TASK-003: Database Setup & Migrations

**Epic:** Database
**Priority:** P0
**Estimate:** 4h
**Dependencies:** TASK-001
**Status:** ✅

**Description:**
Initialize Supabase local development environment. Create SQL migrations for all 8 tables (`users`, `items`, etc.), including triggers, indexes, and RLS policies as per Schema doc.

**Acceptance Criteria:**

- [ ] Supabase CLI initialized
- [ ] Migration files created for all tables and extensions
- [ ] RLS policies applied and verified
- [ ] `seed.sql` populated with test data
- [ ] `types/database.ts` generated via Supabase CLI

### TASK-004: Backend Boilerplate & Env Config

**Epic:** Project Setup
**Priority:** P0
**Estimate:** 2h
**Dependencies:** TASK-001
**Status:** ✅

**Description:**
Set up the Express server entry point, error handling middleware, logger (pino), and strictly typed environment variable loader (using Zod).

**Acceptance Criteria:**

- [ ] Express server listens on port 4000
- [ ] `config/env.ts` validates `DATABASE_URL`, `SUPABASE_KEY`, etc.
- [ ] Global error handler returns standard JSON error format
- [ ] CORS configured for localhost:3000

### TASK-005: Google OAuth Implementation

**Epic:** Authentication
**Priority:** P0
**Estimate:** 4h
**Dependencies:** TASK-004
**Status:** ✅

**Description:**
Implement the backend endpoint `POST /auth/google/callback` to exchange code for session and `GET /auth/me`. Integrate Supabase Auth on the backend.

**Acceptance Criteria:**

- [ ] `auth.service.ts` validates Google token
- [ ] User profile created/updated in `users` table via trigger (or manual sync)
- [ ] JWT session returned to client
- [ ] `auth.middleware.ts` validates JWTs for protected routes

### TASK-006: Frontend Auth & App Shell

**Epic:** UI Components / Auth
**Priority:** P1
**Estimate:** 4h
**Dependencies:** TASK-005
**Status:** ✅

**Description:**
Implement the Authentication Store (Zustand), Login page with Google button, and the main App Shell (Layout) with navigation guards.

**Acceptance Criteria:**

- [ ] Zustand store handles login/logout state
- [ ] Protected routes redirect to `/login`
- [ ] App Shell renders Bottom Nav (mobile) / Sidebar (desktop)
- [ ] User profile data fetched on mount

### TASK-007: Household & Invite API

**Epic:** Households
**Priority:** P1
**Estimate:** 4h
**Dependencies:** TASK-006
**Status:** ✅
**Description:**
Implement CRUD for Households and Member management (Join, Invite, Leave).

**Acceptance Criteria:**

- [ ] `POST /households` creates new household
- [ ] `POST /households/join` processes invite codes
- [ ] RLS policies verified for member access
- [ ] Frontend page for Create/Join Household

---

## Sprint 2: Core Functionality (Est: 28h)

### TASK-008: Categories & Locations Tree API

**Epic:** Households
**Priority:** P1
**Estimate:** 4h
**Dependencies:** TASK-003
**Status:** ✅

**Description:**
Implement hierarchical APIs for Categories and Locations (`GET` tree, `POST`, `PATCH`, `DELETE`).

**Acceptance Criteria:**

- [ ] Endpoints return nested tree structure
- [ ] Max depth constraint (3 levels) enforced on write
- [ ] Cascade delete behavior verified
- [ ] Frontend "TreeSelect" component implemented

### TASK-009: Item CRUD Endpoints

**Epic:** Inventory Core
**Priority:** P0
**Estimate:** 6h
**Dependencies:** TASK-008
**Status:** ✅

**Description:**
Implement the core Inventory Item endpoints: List (paginated/filter), Get Detail, Create, Update, Soft-Delete.

**Acceptance Criteria:**

- [ ] `GET /items` supports search, sort, and pagination
- [ ] `POST /items` accepts JSON payload
- [ ] `PATCH /items/status` handles state transitions
- [ ] Soft deletion works (sets `deleted_at`)

### TASK-010: Inventory UI (List a& Detail)

**Epic:** Pages
**Priority:** P0
**Estimate:** 6h
**Dependencies:** TASK-009
**Status:** ⬜

**Description:**
Build the Item List page (infinite scroll + filters) and Item Detail view.

**Acceptance Criteria:**

- [ ] List displays key info (name, location, status badge)
- [ ] Search bar debounced
- [ ] Detail view shows breadcrumbs for Category/Location
- [ ] Create/Edit forms use React Hook Form + Zod

### TASK-011: Google Drive Integration API

**Epic:** Integration
**Priority:** P1
**Estimate:** 4h
**Dependencies:** TASK-009
**Status:** ⬜

**Description:**
Implement `POST /items/:id/attachments/upload` to handle multipart file uploads to Admin's Google Drive via Service Account.

**Acceptance Criteria:**

- [ ] Backend authenticates with Google Drive API v3
- [ ] Files uploaded to specific Household folder
- [ ] `attachments` table updated with file ID/link
- [ ] Attachments returned in Item Detail API

### TASK-012: Attachment UI

**Epic:** UI Components
**Priority:** P2
**Estimate:** 2h
**Dependencies:** TASK-011
**Status:** ⬜

**Description:**
Add file picker and upload progress UI to Item form and Detail view.

**Acceptance Criteria:**

- [ ] File preview for images
- [ ] Upload progress bar for large files
- [ ] Download/View links work
- [ ] Delete attachment action

### TASK-013: QR Generation & PDF

**Epic:** Integration
**Priority:** P2
**Estimate:** 4h
**Dependencies:** TASK-009
**Status:** ⬜

**Description:**
Implement `GET /items/:id/qr` (single) and `POST /items/qr-batch` (PDF). Use `jsPDF` for layout.

**Acceptance Criteria:**

- [ ] Single QR returns PNG image
- [ ] Batch endpoint generates A4 PDF with grid layout
- [ ] Frontend "Print Labels" page selects items

### TASK-014: UI Polish & Dark Mode

**Epic:** UI Components
**Priority:** P2
**Estimate:** 2h
**Dependencies:** None
**Status:** ⬜

**Description:**
Ensure Tailwind Dark Mode works correctly across all components. Add micro-interactions (toasts, loading skeletons).

**Acceptance Criteria:**

- [ ] Theme toggler works
- [ ] Loading states for all fetch operations
- [ ] Error toasts for failed API calls

---

## Sprint 3: Advanced & Deploy (Est: 20h)

### TASK-015: Dexie.js Offline Database Support

**Epic:** Offline & Sync
**Priority:** P1
**Estimate:** 4h
**Dependencies:** None
**Status:** ⬜

**Description:**
Set up Dexie.js schema for `items`, `categories`, `locations`. Implement "Read-through" repository pattern on Frontend.

**Acceptance Criteria:**

- [ ] Dexie DB initializes on client
- [ ] Hooks read from Dexie first, then API
- [ ] Background fetch updates Dexie

### TASK-016: Offline Sync Logic

**Epic:** Offline & Sync
**Priority:** P1
**Estimate:** 6h
**Dependencies:** TASK-015
**Status:** ⬜

**Description:**
Implement the Sync Engine: Capture mutations when offline, queue them, and retry when online against `POST /sync`.

**Acceptance Criteria:**

- [ ] Mutation queue allows Create/Update/Delete offline
- [ ] `useSync` hook manages online/offline state
- [ ] Conflict resolution UI (toast/banner)
- [ ] Sync indicator in UI

### TASK-017: Unit & Integration Tests

**Epic:** Testing
**Priority:** P2
**Estimate:** 6h
**Dependencies:** All Features
**Status:** ⬜

**Description:**
Write Vitest unit tests for shared utils/validators and integration tests for critical API flows (Auth, Item CRUD).

**Acceptance Criteria:**

- [ ] Shared package coverage > 80%
- [ ] Critical API paths tested (happy path + auth failure)
- [ ] Frontend component tests for complex forms

### TASK-018: CI/CD & Deployment

**Epic:** Deployment
**Priority:** P1
**Estimate:** 4h
**Dependencies:** All Features
**Status:** ⬜

**Description:**
Configure GitHub Actions for CI. Deploy Database to Supabase (Prod), API to Render, Web to Vercel. Set up environment variables on platforms.

**Acceptance Criteria:**

- [ ] CI passes on PR
- [ ] Render service health check passes
- [ ] Vercel build succeeds
- [ ] Production URL accessible and functional
