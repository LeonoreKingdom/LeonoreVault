# Product Requirements Document (PRD)

**Product:** LeonoreVault  
**Version:** 1.0 (MVP)  
**Author:** Product Team + AI  
**Date:** 2026-02-08  
**Status:** Draft

---

## 1. Product Overview

### Vision Statement

Empower every household to manage their belongings as effortlessly and professionally as a warehouse — knowing what they own, where it is, and who has it — through an intuitive, cross-platform progressive web app.

### Problem Statement

In a typical household, items are frequently misplaced because family members put things wherever they like and forget about them. There is no centralized system to track **what** items exist, **where** they are stored, and **who** last moved or borrowed them. This leads to wasted time searching for things, duplicated purchases, and household friction. Existing solutions are either too complex (enterprise WMS), too limited (spreadsheets), or lack critical family-specific features like lending accountability and real-time collaboration.

### Target Users

| Segment                                  | Description                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Primary — Family / Household Members** | Family members (ages 10–65+) within a single household who share common spaces and belongings. Includes parents who organize, teens/kids who misplace items, and elderly family members who need simplicity. |
| **Secondary — Other Households (SaaS)**  | Homeowners, renters, or small communities who want to catalog belongings for organization, insurance, moving, or estate management.                                                                          |
| **Tertiary — Small Business / Offices**  | Small offices, co-working spaces, or organizations managing shared equipment and supplies (future expansion).                                                                                                |

### Success Metrics

| Metric                        | Target (MVP)                                            | How to Measure                   |
| ----------------------------- | ------------------------------------------------------- | -------------------------------- |
| Onboarding Completion Rate    | ≥ 80% of sign-ups complete profile + add first item     | Analytics funnel tracking        |
| Daily Active Users (DAU)      | ≥ 3 household members actively using the app daily      | Supabase auth + event tracking   |
| Items Cataloged per Household | ≥ 50 items within first 2 weeks                         | Database query                   |
| Item Retrieval Success Rate   | ≥ 90% of "where is item X?" searches resolved instantly | In-app search success tracking   |
| Lost & Found Resolution Time  | Average < 24 hours from "lost" to "found"               | Timestamp diff on status changes |
| User Satisfaction (NPS)       | ≥ 40                                                    | In-app survey after 2 weeks      |
| App Load Time (PWA)           | < 3 seconds on 4G                                       | Lighthouse / Web Vitals          |
| Offline Sync Reliability      | 99% of offline actions sync correctly when back online  | Error rate monitoring            |

---

## 2. User Personas

### Persona 1: Leanne — The Organizing Parent

**Role:** Stay-at-home parent / household manager  
**Age:** 38  
**Demographics:** Married, 2 kids (ages 10 & 15), suburban homeowner, smartphone-savvy but not technical  
**Tech Comfort:** Moderate — uses WhatsApp, Google Drive, online shopping apps daily

**Goals:**

- Know exactly where every important item is at all times
- Stop wasting 15+ minutes daily searching for misplaced things
- Hold family members accountable for items they borrow or move
- Have an organized digital inventory for insurance or moving purposes

**Frustrations:**

- Kids take things (scissors, chargers, tools) and never return them
- Husband puts things in random places and forgets
- Paper lists and spreadsheets are tedious and never stay updated
- Existing apps are too complex or look like enterprise software

**Scenario:**  
Leanne's son borrowed the family's portable speaker for a school event. Two weeks later, no one can find it. With LeonoreVault, Leanne checks the app — it shows her son last scanned the speaker out on Jan 25, tagged as "School." She sends him a notification through the app, and he remembers he left it in his locker. Speaker recovered in minutes, not days.

---

### Persona 2: Alex — The Teenage Family Member

**Role:** High school student / reluctant user  
**Age:** 15  
**Demographics:** Lives with parents and younger sibling, digital native, uses phone for everything  
**Tech Comfort:** High — games, social media, YouTube, but low patience for "boring" apps

**Goals:**

- Find his own stuff quickly without asking mom
- Avoid getting blamed for losing shared items
- Spend as little time as possible on "chores" like organizing

**Frustrations:**

- Gets blamed when family items go missing even if he didn't take them
- Doesn't know where things are stored because the system changes
- Scanning or logging items feels like extra work

**Scenario:**  
Alex needs the family's HDMI cable for a gaming session. Instead of tearing apart drawers, he opens LeonoreVault, searches "HDMI," and sees it's in the "Living Room TV Cabinet — Drawer 2." He grabs it, scans the QR on it with one tap to mark it as "with Alex," and goes back to gaming. Total time: 15 seconds.

---

### Persona 3: Leonore — The Pragmatic Homeowner (SaaS User)

**Role:** Working professional / homeowner  
**Age:** 45  
**Demographics:** Owns a mid-sized home, married, 3 kids, moderate tech literacy  
**Tech Comfort:** Low-to-moderate — uses banking apps and WhatsApp, dislikes complicated setups

**Goals:**

- Catalog home belongings for insurance purposes
- Know the value and condition of large household items
- Keep track of warranties and receipts digitally
- Simple enough that his wife and older kids can also use it

**Frustrations:**

- Lost a significant insurance claim because he couldn't prove what he owned
- Tried spreadsheets — never kept them updated
- Free apps had harsh item limits or terrible UX

**Scenario:**  
After a minor flood damages some electronics, Leonore opens LeonoreVault and generates a report of all items tagged under "Living Room" and "Electronics," complete with photos and estimated values. He exports this as a PDF and submits it to his insurance company. What used to take days of scrambling takes 10 minutes.

---

## 3. User Stories

### Epic 1: Item Management (CMS)

| ID     | User Story                                                                                                                                 | Acceptance Criteria                                                                                                                                                             | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-001 | As a **household member**, I want to **add a new item** with name, photo, category, and location so that **it is tracked in the system**   | - Form captures: name, description, photo(s), category, location/storage, quantity<br>- Item saved to database with timestamp and creator ID<br>- Confirmation shown after save | P0       |
| US-002 | As a **household member**, I want to **edit an existing item's details** so that **information stays accurate**                            | - All fields editable<br>- Edit history/timestamp logged<br>- Changes reflected immediately                                                                                     | P0       |
| US-003 | As a **household member**, I want to **delete an item** so that **disposed or donated items are removed**                                  | - Soft delete with confirmation prompt<br>- Item moves to "Recently Deleted" (30-day retention)<br>- Can be restored within retention period                                    | P0       |
| US-004 | As a **household member**, I want to **search and filter items** by name, category, location, or tag so that **I can find things quickly** | - Full-text search with instant results (< 500ms)<br>- Filter by: category, location, status, assigned person<br>- Results show item photo thumbnail, name, location            | P0       |
| US-005 | As a **household manager**, I want to **bulk import items** (CSV/spreadsheet) so that **initial setup is faster**                          | - CSV upload with column mapping<br>- Validation errors shown per row<br>- Preview before confirming import                                                                     | P2       |

### Epic 2: Category & Location Management

| ID     | User Story                                                                                                                                                         | Acceptance Criteria                                                                                                                                                | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| US-006 | As a **household manager**, I want to **create and manage categories** (e.g., Electronics, Kitchen, Tools) so that **items are logically organized**               | - CRUD operations on categories<br>- Categories support nesting (sub-categories)<br>- Default categories provided on setup<br>- Icon/color assignment per category | P0       |
| US-007 | As a **household manager**, I want to **define locations and storage units** (e.g., Master Bedroom → Wardrobe → Shelf 2) so that **physical placement is tracked** | - Hierarchical location structure (Room → Furniture → Shelf/Drawer)<br>- Location supports custom naming<br>- Visual breadcrumb for nested locations               | P0       |
| US-008 | As a **household member**, I want to **move an item to a different location** so that **the system reflects its real position**                                    | - Location change logged with timestamp and user<br>- Previous location kept in history<br>- One-tap or scan-to-move action                                        | P0       |

### Epic 3: QR Code / Scanning

| ID     | User Story                                                                                                                                                    | Acceptance Criteria                                                                                                                                                  | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-009 | As a **household manager**, I want to **generate QR code labels** for items so that I can **physically tag belongings**                                       | - Generate printable QR code per item<br>- QR encodes a unique item identifier<br>- Batch QR generation for multiple items<br>- Print-friendly layout (label sheets) | P0       |
| US-010 | As a **household member**, I want to **scan a QR code to view item details** so that **I can instantly identify and locate any tagged item**                  | - Camera opens with single tap<br>- QR decoded within 1 second<br>- Item detail page shown immediately after scan<br>- Works in low-light conditions (flash toggle)  | P0       |
| US-011 | As a **household member**, I want to **scan a QR code to quickly update an item's status or location** so that **tracking stays current with minimal effort** | - After scan, show quick-action menu: "Move," "Borrow," "Return," "Mark as Lost"<br>- Action completes in ≤ 2 taps after scan                                        | P0       |

### Epic 4: Authentication & Household Management

| ID     | User Story                                                                                                                      | Acceptance Criteria                                                                                                                                  | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-012 | As a **new user**, I want to **sign up with email or social login** (Google) so that **I can create my account easily**         | - Email + password registration<br>- Google OAuth sign-in<br>- Email verification<br>- Password strength enforcement                                 | P0       |
| US-013 | As a **household manager**, I want to **create a household group and invite family members** so that **we share one inventory** | - Create household with custom name<br>- Generate invite link or code<br>- Accept/reject invitations<br>- Maximum 10 members per household (MVP)     | P0       |
| US-014 | As a **household manager**, I want to **assign roles** (Admin, Member, Viewer) so that **access is controlled**                 | - Admin: full CRUD + member management<br>- Member: add/edit items, scan, borrow<br>- Viewer: read-only access<br>- Role displayed on member profile | P0       |
| US-015 | As a **user**, I want to **log in and have the app remember my session** so that **I don't re-authenticate constantly**         | - Persistent session (30-day token)<br>- Biometric/PIN unlock option on mobile<br>- Secure token refresh mechanism                                   | P0       |

### Epic 5: Lost & Found

| ID     | User Story                                                                                                                                                           | Acceptance Criteria                                                                                                                                 | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-016 | As a **household member**, I want to **mark an item as "lost"** so that **others know it's missing and can help find it**                                            | - "Mark as Lost" action on item detail<br>- Lost items appear in dedicated "Lost & Found" dashboard<br>- Notification sent to all household members | P0       |
| US-017 | As a **household member**, I want to **report a found item** (scan or manual) and assign it to the Lost & Found box so that **items have a known recovery location** | - "Found" action with optional photo and location<br>- Item status changes to "In Lost & Found Box"<br>- Original owner notified                    | P0       |
| US-018 | As a **household member**, I want to **claim a found item** and return it to its proper location so that **the cycle is closed**                                     | - "Claim" action on Lost & Found item<br>- Prompt to set correct storage location<br>- Item status returns to "Stored"<br>- Activity logged         | P1       |

### Epic 6: Offline Mode

| ID     | User Story                                                                                                                        | Acceptance Criteria                                                                                                                             | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-019 | As a **household member**, I want to **use the app offline** (view items, scan, add) so that **I'm not blocked by poor internet** | - Service worker caches critical assets and recent data<br>- Offline indicator shown in UI<br>- Add/edit/scan actions queued locally            | P0       |
| US-020 | As a **household member**, I want **offline changes to sync automatically** when I'm back online so that **no data is lost**      | - Background sync on reconnection<br>- Conflict resolution: last-write-wins with conflict log<br>- Sync status indicator (pending/synced/error) | P0       |

### Epic 7: Notifications

| ID     | User Story                                                                                                                                      | Acceptance Criteria                                                                                                                                               | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-021 | As a **household member**, I want to **receive push notifications** when an item is marked lost, found, or borrowed so that **I stay informed** | - Push via Firebase Cloud Messaging<br>- Notification types: lost, found, borrow request, return reminder<br>- In-app notification center with read/unread states | P1       |
| US-022 | As a **household manager**, I want to **set reminders for borrowed items** so that **people return them on time**                               | - Set return due date when lending<br>- Automatic reminder notification at due date<br>- Overdue items highlighted in dashboard                                   | P1       |

### Epic 8: Attachments via Google Drive

| ID     | User Story                                                                                                                                                                                    | Acceptance Criteria                                                                                                                                                                                                                                               | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-023 | As a **household member**, I want to **attach photos, receipts, or warranty documents** to items via Google Drive so that **important records are linked without consuming Supabase storage** | - Google Drive OAuth integration<br>- Upload to Google Drive from app (camera capture or file select)<br>- DB stores only Drive file ID + metadata (name, type, thumbnail URL)<br>- Max 10 attachments per item<br>- Preview/thumbnail in-app; tap opens in Drive | P0       |
| US-024 | As a **household member**, I want to **link existing Google Drive files** to an item so that **I can attach documents I already have**                                                        | - Google Drive Picker to browse and select existing files<br>- Link stored (not copied) — opens in Drive<br>- Supports images, PDFs, and documents<br>- Permissions validated on link                                                                             | P0       |

### Epic 9: Real-Time Chat

| ID     | User Story                                                                                                                    | Acceptance Criteria                                                                                                                       | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-025 | As a **household member**, I want to **chat with family in a household group chat** so that **we can coordinate about items** | - Real-time messaging (Supabase Realtime / WebSocket)<br>- Text messages with timestamps and sender<br>- Online/offline status indicators | P2       |
| US-026 | As a **household member**, I want to **start a thread on a specific item** so that **conversations are contextual**           | - "Discuss" button on item detail<br>- Item-specific chat thread<br>- Thread linked back to item                                          | P2       |

---

## 4. Feature Requirements

### Feature 1: Item CMS (Create, Read, Update, Delete)

**Priority:** P0 (MVP)  
**Complexity:** Medium

**Description:**  
Core content management for household items. Users can add items with rich details (name, description, photos, category, location, quantity, tags), edit them, search/filter, and soft-delete. The item detail page serves as the central hub linking to QR, history, attachments, and chat.

**User Stories Addressed:** US-001, US-002, US-003, US-004

**Requirements:**

- Item data model: `id`, `name`, `description`, `drive_photos[]` (Google Drive file IDs/links), `category_id`, `location_id`, `quantity`, `tags[]`, `status` (stored / borrowed / lost / in-lost-found), `created_by`, `created_at`, `updated_at`, `deleted_at`
- Photos uploaded to user's Google Drive via API; DB stores only Drive file ID + thumbnail URL (no physical files in Supabase Storage)
- Real-time search with debounced input (< 500ms results)
- List view and grid view toggle
- Infinite scroll or pagination (20 items per page)
- Item detail page with tabbed sections: Info, History, Attachments

---

### Feature 2: Category & Location Management

**Priority:** P0 (MVP)  
**Complexity:** Medium

**Description:**  
Hierarchical taxonomy system for organizing items. Categories represent _what_ an item is (Electronics, Kitchen, Tools). Locations represent _where_ an item physically resides (Room → Furniture → Shelf). Both support nesting up to 3 levels.

**User Stories Addressed:** US-006, US-007, US-008

**Requirements:**

- Category model: `id`, `name`, `parent_id`, `icon`, `color`, `household_id`
- Location model: `id`, `name`, `parent_id`, `description`, `household_id`
- Default seed categories on household creation (Electronics, Kitchen, Bathroom, Bedroom, Tools, Documents, Clothing, Sports, Others)
- Default seed locations prompt (e.g., "Add your rooms first")
- Breadcrumb navigation for nested items
- Drag-and-drop reordering (P1)
- Visual location tree/map (P2)

---

### Feature 3: QR Code Scanning & Generation

**Priority:** P0 (MVP)  
**Complexity:** Medium

**Description:**  
Generate unique QR code labels for physical items and scan them via device camera to instantly view or update item information. This is the primary interaction model for quick tracking — designed to be faster than manual search.

**User Stories Addressed:** US-009, US-010, US-011

**Requirements:**

- QR generation: encode item UUID, render as SVG/PNG
- Batch QR generation: select multiple items → generate printable PDF (A4 label sheet layout)
- Scanner: use device camera via `html5-qrcode` or `zxing-js/library`
- Scan response: show item detail with quick-action overlay (Move, Borrow, Return, Lost)
- Works on both front and rear cameras
- Flash/torch toggle for low-light scanning
- Unrecognized QR code: prompt to create new item with scanned data
- Camera permission request with clear explanation

---

### Feature 4: Authentication & Household Groups

**Priority:** P0 (MVP)  
**Complexity:** Medium

**Description:**  
User registration, login, and session management powered by Supabase Auth. Household groups allow family members to share a single inventory with role-based access control (Admin, Member, Viewer).

**User Stories Addressed:** US-012, US-013, US-014, US-015

**Requirements:**

- Supabase Auth: email/password + Google OAuth
- Email verification required before invite acceptance
- Household model: `id`, `name`, `created_by`, `invite_code`, `created_at`
- Membership model: `user_id`, `household_id`, `role` (admin / member / viewer), `joined_at`
- Invite link with 7-day expiry, regeneratable by admin
- First user who creates household is auto-assigned Admin
- Session: JWT with 30-day refresh token
- Row-Level Security (RLS) policies per household

---

### Feature 5: Lost & Found System

**Priority:** P0 (MVP)  
**Complexity:** Low

**Description:**  
A dedicated workflow and dashboard for managing missing items. Any household member can mark an item as "lost," and others can report it as "found." A physical Lost & Found box is encouraged, and the app tracks items placed there until claimed.

**User Stories Addressed:** US-016, US-017, US-018

**Requirements:**

- Item status state machine: `stored` → `lost` ↔ `in_lost_found` → `stored`; `stored` → `borrowed` → `stored`
- "Lost & Found" dashboard tab showing all items with `lost` or `in_lost_found` status
- "Mark as Lost" action: captures who reported, when, optional last-known location
- "Report Found" action: captures who found, where, optional photo
- Activity feed on item detail showing status transitions
- (P1) Push notification to household on lost/found events

---

### Feature 6: Offline Mode (PWA)

**Priority:** P0 (MVP)  
**Complexity:** High

**Description:**  
Full Progressive Web App with service worker caching and offline data storage. Users can browse cached items, scan QR codes, and add/edit items while offline. All changes sync automatically when connectivity resumes.

**User Stories Addressed:** US-019, US-020

**Requirements:**

- Service worker: precache app shell + critical assets
- IndexedDB (via `idb` or `Dexie.js`) for local data storage
- Offline-capable pages: item list, item detail, QR scanner, add/edit item
- Sync queue: store mutations locally, replay on reconnect
- Conflict resolution strategy: last-write-wins with server timestamp
- Sync status UI: badge showing pending changes count
- "Install App" prompt for supported browsers
- Web App Manifest with icons, theme color, display: standalone

---

### Feature 7: Push Notifications

**Priority:** P1 (Important)  
**Complexity:** Medium

**Description:**  
Push notifications via Firebase Cloud Messaging (FCM) to alert household members about lost items, found items, borrow requests, and return reminders. Includes an in-app notification center.

**User Stories Addressed:** US-021, US-022

**Requirements:**

- Firebase Cloud Messaging integration
- Notification types: `item_lost`, `item_found`, `borrow_request`, `return_reminder`, `household_invite`
- User preference: opt-in/out per notification type
- In-app notification center with read/unread state
- Notification payload: title, body, item thumbnail, deep link to item
- Scheduled reminders for overdue borrowed items (cron job or Supabase Edge Function)

---

### Feature 8: Google Drive Attachment Storage (Primary)

**Priority:** P0 (MVP)  
**Complexity:** Medium

**Description:**  
All item photos, receipts, warranties, and documents are stored on the **household admin's Google Drive** (leveraging existing 2TB Google One subscription). The app uploads files to a dedicated `LeonoreVault/` folder structure and stores only the file ID, metadata, and thumbnail URL in Supabase. This eliminates Supabase Storage costs entirely and provides virtually unlimited storage.

**User Stories Addressed:** US-023, US-024

**Requirements:**

- **Architecture — Google Drive as Central Household Storage:**
  - Google OAuth with `drive.file` scope (app can only access files it created + files user explicitly shares)
  - **1 household = 1 Drive (admin's account).** The household admin's Google Drive serves as central storage. All members' uploads go to the admin's Drive.
  - Express API handles Drive uploads server-side using admin's stored refresh token — members don't need Drive permissions, only app authentication
  - Files shared with household members at file-level via Drive API for direct viewing access
  - On photo capture / file upload: app → Express API → upload to admin's Drive → stores returned `fileId`, `name`, `mimeType`, `thumbnailLink`, `webViewLink` in Supabase
  - DB schema for attachments: `id`, `item_id`, `drive_file_id`, `file_name`, `mime_type`, `thumbnail_url`, `web_view_link`, `created_by`, `created_at`
  - No physical files stored in Supabase Storage
- **Folder Structure (Item-ID-based):**

  ```
  My Drive /
  └── LeonoreVault /
      └── {household_name} /
          ├── items /
          │   ├── {item_uuid_1} /
          │   │   ├── photo_1.jpg
          │   │   ├── receipt.pdf
          │   │   └── warranty.pdf
          │   └── {item_uuid_2} /
          │       └── photo_1.jpg
          └── lost-found /
              └── {item_uuid} /
                  └── found_photo.jpg
  ```

  - **Why item-ID-based (not location-based):** When items move between locations (the core use case), files stay in place — no Drive file moves needed. Location context lives in the DB, not the folder tree.

- **Upload Flow:**
  - Camera capture → compress client-side (max 2MB) → upload to Express API → API uploads to admin's Drive → save metadata to Supabase
  - File select from device → same flow
  - Supported formats: JPEG, PNG, PDF, DOCX
  - Max 10 attachments per item
- **Link Existing Files:**
  - Google Drive Picker API to browse and select existing Drive files
  - Store link + metadata only (no copy/move)
- **Display:**
  - Thumbnail preview in item detail (loaded from Drive `thumbnailLink`)
  - Tap to open full file in Google Drive (via `webViewLink`)
  - Fallback: generic file icon if thumbnail unavailable
- **Offline Consideration:**
  - Thumbnails cached locally for offline viewing
  - New uploads queued in sync queue; uploaded to Drive when back online
- **SaaS Consideration (Future):**
  - For SaaS users without Google One: offer Supabase Storage as fallback (with limits)
  - Abstract storage layer in Express API to support multiple backends

---

### Feature 9: Real-Time Household Chat

**Priority:** P2 (Nice to Have)  
**Complexity:** Medium

**Description:**  
Real-time chat within the household group, powered by Supabase Realtime (WebSocket). Includes a general household channel and item-specific discussion threads for contextual conversations about specific belongings.

**User Stories Addressed:** US-025, US-026

**Requirements:**

- Supabase Realtime channel per household
- Message model: `id`, `household_id`, `item_id` (nullable), `sender_id`, `content`, `created_at`
- General chat tab in household view
- Item-specific thread accessible from item detail
- Typing indicators
- Online/offline presence
- Message history with pagination (50 messages per page)
- No file attachments in chat (MVP)

---

## 5. MVP Scope

### In Scope (MVP — 1 Week)

| #   | Feature                            | Core Functionality                                                            |
| --- | ---------------------------------- | ----------------------------------------------------------------------------- |
| 1   | **Item CMS**                       | Add, edit, delete, search/filter items with photos, categories, and locations |
| 2   | **Category & Location Management** | Create/manage hierarchical categories and storage locations                   |
| 3   | **QR Code Scan & Generate**        | Generate QR labels, scan to view/update items via device camera               |
| 4   | **Authentication & Households**    | Email/Google sign-up, household creation, member invites, role-based access   |
| 5   | **Lost & Found**                   | Mark items lost, report found, Lost & Found dashboard                         |
| 6   | **Offline Mode (PWA)**             | Service worker caching, offline browse/scan/add, background sync              |
| 7   | **Google Drive Attachments**       | Photos & documents stored on Google Drive; DB stores only file IDs/links      |

### Out of Scope (Post-MVP)

| #   | Feature                                       | Target Version |
| --- | --------------------------------------------- | -------------- |
| 1   | Push Notifications (FCM)                      | v1.1           |
| 2   | Borrow/Return Reminders                       | v1.1           |
| 3   | Real-Time Chat                                | v1.2           |
| 4   | Bulk CSV Import                               | v1.2           |
| 5   | Item Value Tracking & Insurance Reports       | v2.0           |
| 6   | 3D Home Visualization (Three.js)              | v2.0           |
| 7   | AI Item Recognition (photo → auto-categorize) | v2.0           |
| 8   | Multi-household Support                       | v2.0           |
| 9   | SaaS Billing & Subscription (Stripe)          | v2.0           |
| 10  | Activity Analytics Dashboard                  | v2.0           |

### MVP Launch Criteria

- [ ] User can sign up (email + Google) and create a household
- [ ] User can invite family members via link/code
- [ ] User can add items with name, photo, category, and location
- [ ] User can attach photos/documents via Google Drive (no files stored in Supabase)
- [ ] User can search and filter items with results in < 1 second
- [ ] User can generate and print QR code labels
- [ ] User can scan QR codes and view/update items
- [ ] User can mark items as lost and report them found
- [ ] Lost & Found dashboard shows all unresolved items
- [ ] App works offline (browse, scan, add) and syncs on reconnect
- [ ] App is installable as PWA on mobile and desktop
- [ ] RLS policies enforce household-level data isolation
- [ ] App loads in < 3 seconds on 4G mobile connection
- [ ] Express.js API layer handles business logic between frontend and Supabase/Drive

---

## 6. User Flows

### Flow 1: New User Onboarding

```
1. User opens LeonoreVault URL on their device
2. Lands on marketing/landing page with "Get Started" CTA
3. Clicks "Get Started" → Registration page
4. Chooses sign-up method:
   a. Email + password → fills form → receives verification email → verifies
   b. Google OAuth → one-click authorization
5. After auth, redirected to "Setup Your Household" screen
6. Enters household name (e.g., "The Pratama Family")
7. App creates household and assigns user as Admin
8. Guided setup wizard:
   a. Step 1: "Add your rooms" — pre-suggested rooms (Living Room, Kitchen, etc.), user toggles/customizes
   b. Step 2: "Add your first item" — interactive demo showing how to fill in item details
   c. Step 3: "Print your first QR label" — generates QR for the item just added
9. Setup complete → redirected to main Dashboard
10. Toast prompt: "Invite your family!" with invite link/code
```

### Flow 2: Adding an Item (Core Action)

```
1. User taps "+" floating action button on Dashboard
2. "Add Item" form opens:
   a. Name (required) — text input
   b. Photo — camera capture or gallery upload (optional but encouraged)
   c. Category — dropdown with search (required)
   d. Location — cascading dropdown: Room → Furniture → Shelf (required)
   e. Quantity — number input (default: 1)
   f. Description — optional text area
   g. Tags — optional free-form tags
3. User fills in details and taps "Save"
4. Item is created, QR code auto-generated
5. Success toast: "Item added! [Print QR Label]" with CTA
6. User returns to Dashboard; new item appears at top of list
```

### Flow 3: Scanning a QR Code

```
1. User taps "Scan" button (prominent in bottom nav / header)
2. Camera viewfinder opens with targeting overlay
3. User points camera at QR code on a physical item
4. QR decoded → item identified in < 1 second
5. Item quick-action sheet slides up:
   - View Details
   - Move to... (change location)
   - Borrow (assigns to current user)
   - Return (if currently borrowed by user)
   - Mark as Lost
6. User selects an action, confirms if needed
7. Action recorded with timestamp and user attribution
8. Sheet dismisses, user can scan another item immediately
```

### Flow 4: Lost & Found Workflow

```
1. User notices an item is missing
2. Opens LeonoreVault → searches for item or browses
3. On item detail, taps "Mark as Lost"
4. Confirmation dialog: "Mark [Item Name] as lost?"
5. User confirms; item status changes to "Lost"
6. (P1) All household members receive push notification: "[Item] has been marked as lost by [User]"
7. Item appears in "Lost & Found" dashboard tab
   ---
8. Later, another family member finds the item
9. They open the app → go to "Lost & Found" tab → find the item
   OR scan the item's QR code → see "This item is marked as Lost"
10. Taps "Report Found" → optionally adds where they found it
11. Item status changes to "In Lost & Found Box"
12. (P1) Notification sent to the member who reported it lost
13. Original user (or anyone) claims the item and returns it to proper storage
14. Status returns to "Stored" with updated location
```

### Flow 5: Inviting a Family Member

```
1. Admin goes to Settings → Household → Members
2. Taps "Invite Member"
3. App generates a shareable invite link (or 6-digit code)
4. Admin shares link via WhatsApp, SMS, or other messaging app
5. Invited person clicks link → opens LeonoreVault
6. If not signed up: registers first, then auto-joins household
7. If signed up: prompted to accept invitation
8. New member appears in household with "Member" role
9. Admin can change role to "Viewer" or promote to "Admin"
```

---

## 7. Non-Functional Requirements

| Category          | Requirement            | Details                                                                                                                    |
| ----------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Performance**   | Page load < 3s on 4G   | Lighthouse Performance score ≥ 80. First Contentful Paint < 1.5s. Core Web Vitals pass.                                    |
| **Performance**   | Search results < 500ms | Debounced full-text search using Supabase `ilike` or `tsvector`. Indexing on name, tags.                                   |
| **Performance**   | QR scan < 1 second     | Decode time after camera focus. Use Web Worker if needed to avoid main thread blocking.                                    |
| **Performance**   | Offline load < 1s      | Cached app shell loads instantly from service worker.                                                                      |
| **Security**      | Authentication         | Supabase Auth with JWT. Secure HTTP-only cookies or localStorage with token rotation.                                      |
| **Security**      | Authorization          | Row-Level Security (RLS) on all tables. Users can only access their household's data.                                      |
| **Security**      | Data encryption        | HTTPS enforced (TLS 1.2+). Supabase encrypts data at rest.                                                                 |
| **Security**      | Input validation       | Server-side validation on all inputs. Sanitize against XSS and SQL injection.                                              |
| **Security**      | File upload            | Validate file type and size server-side. Scan for malware (P2).                                                            |
| **Accessibility** | WCAG 2.1 AA compliance | Keyboard navigable, screen reader friendly, proper ARIA labels, color contrast ≥ 4.5:1.                                    |
| **Accessibility** | Multi-language         | Support Indonesian (Bahasa) and English (MVP). i18n framework from start.                                                  |
| **Accessibility** | Responsive design      | Mobile-first PWA. Fully usable from 320px to 1440px+ viewports.                                                            |
| **Scalability**   | Free tier capacity     | Supabase free: 500MB DB, 1GB storage, 50K monthly active users. Sufficient for MVP.                                        |
| **Scalability**   | Future SaaS readiness  | Multi-tenant data model from day 1 (household_id on all tables). Plan for Supabase Pro (\$25/mo) when exceeding free tier. |
| **Reliability**   | Uptime                 | Target 99.5% uptime. Dependent on Supabase infrastructure (99.9% SLA on Pro).                                              |
| **Reliability**   | Offline reliability    | 99%+ of offline mutations must sync successfully without data loss.                                                        |
| **Compatibility** | Browser support        | Chrome 90+, Safari 15+, Firefox 90+, Edge 90+. PWA install on Android Chrome and iOS Safari.                               |

---

## 8. Assumptions & Dependencies

### Assumptions

1. **Family adoption:** At least 2-3 household members will actively use the app after onboarding — the system is more valuable with more participants.
2. **QR labels:** Users have access to a printer (or can use a shared/office printer) to print QR labels for physical items.
3. **Smartphone availability:** All active users have smartphones with cameras capable of scanning QR codes.
4. **Internet access:** Users have regular internet access; offline mode is for intermittent gaps, not extended offline-only usage.
5. **Supabase free tier:** The free tier is sufficient for MVP database and auth (< 500MB database, < 50K MAU). **No Supabase Storage used** — all files go to Google Drive.
6. **Google Drive availability:** Household admin has a Google account with sufficient Drive storage (2TB Google One). Admin's Drive serves as central storage. Other members upload via the Express API (using admin's stored credentials) — they only need app auth, not Drive permissions.
7. **Single household per user (MVP):** A user belongs to one household in MVP. Multi-household support is deferred.
8. **No native app required:** PWA provides sufficient mobile experience; native iOS/Android apps are not needed for MVP.
9. **Express API layer:** Backend business logic runs through an Express.js API (not direct Supabase client SDK from frontend), enabling better separation of concerns and future SaaS extensibility.

### External Dependencies

| Dependency               | Purpose                           | Risk Level                                                                        | Mitigation                                                                                                                                |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**             | Database, Auth, Realtime          | Medium — free tier limits, potential outages                                      | Monitor usage; plan upgrade path to Pro (\$25/mo). DB schema portable to self-hosted Postgres. No file storage used (all files on Drive). |
| **Google Drive API**     | Primary file/photo storage (MVP)  | Medium — requires OAuth consent, API quotas (free: 1B queries/day)                | Use `drive.file` scope (least privilege). Rate limits generous for household use. Fallback: Supabase Storage for SaaS users later.        |
| **Google OAuth**         | Social login + Drive access       | Low — highly reliable, free                                                       | Single OAuth flow handles both auth and Drive permissions.                                                                                |
| **Firebase (FCM)**       | Push notifications (P1)           | Low — free tier generous (unlimited notifications)                                | Not in MVP critical path. Can defer or replace with Supabase Edge Functions + web push.                                                   |
| **Vercel**               | Deployment / hosting (Next.js FE) | Low — free tier fits Next.js PWA well                                             | Alternative: Netlify, Cloudflare Pages.                                                                                                   |
| **Express.js on Render** | Backend API layer                 | Low — mature, well-documented. Render free: 750h/mo, cold starts after 15min idle | Keep Express lightweight for fast cold starts (<3s). Upgrade to Render paid ($7/mo) if cold starts become an issue.                       |
| **html5-qrcode / zxing** | QR scanning library               | Low — open-source, well-maintained                                                | Pin version; fallback to manual lookup if camera fails.                                                                                   |
| **Dexie.js / idb**       | Offline IndexedDB wrapper         | Low — open-source, stable                                                         | Lightweight with no external service dependency.                                                                                          |

---

## 9. Open Questions

### Resolved

- [x] ~~**Supabase vs. standalone API routes:**~~ → **Decided: Express.js API layer.** Backend business logic through Express.js for separation of concerns and SaaS extensibility.
- [x] ~~**Internationalization (i18n):**~~ → **Decided: Bilingual (Bahasa + English) best-effort in MVP.** Set up i18n framework from start; if time-constrained, launch English-only and add Bahasa in v1.1.
- [x] ~~**Photo storage strategy:**~~ → **Decided: Google Drive as primary storage.** User has 2TB Google One. DB stores only Drive file IDs/metadata. No Supabase Storage for files.
- [x] ~~**Google Drive folder structure:**~~ → **Decided: Item-ID-based folders.** `LeonoreVault / {household} / items / {item_uuid} /`. Files never need to move when items change locations — location context stays in the DB. Avoids API complexity of file relocation.
- [x] ~~**Google Drive sharing for household members:**~~ → **Decided: Admin's Drive as central storage.** 1 household = 1 Drive (admin's account). Express API uploads using admin's stored refresh token. Files shared at file-level for member viewing access.
- [x] ~~**Express.js deployment:**~~ → **Decided: Render (free tier).** 750 hours/month free, auto-sleep after 15min inactivity with cold starts ~3s. Railway no longer has a true free tier ($5 trial credit only). Keep Express lightweight for fast cold restarts.

### Open

- [ ] **QR label format:** What physical label size/format works best? Avery-style label sheets? Sticker printer (e.g., Brother PT)? Need to test with family.
- [ ] **Conflict resolution for offline sync:** Is last-write-wins acceptable, or do we need a more sophisticated merge strategy (e.g., CRDT)? Depends on how frequently simultaneous edits occur.
- [ ] **Item value tracking:** Should MVP include optional "estimated value" field for insurance readiness, even if reports are deferred?
- [ ] **Data model: items vs. containers:** Should containers (boxes, drawers) be modeled as items themselves (containing other items) or strictly as locations?
- [ ] **PWA install prompt timing:** When should we prompt users to install? After first item added? After 2nd visit? Need UX research.
- [ ] **Privacy policy & Terms of Service:** Required before SaaS launch. At what point do we need these drafted?
- [ ] **Analytics stack:** What analytics/telemetry should we embed from day 1 to measure success metrics? Options: Supabase Logs, PostHog (free tier), Plausible, or custom events.
- [ ] **Export functionality:** Should users be able to export their full inventory as CSV or PDF from MVP? Useful for insurance but adds scope.

---

**Changelog:**

- 2026-02-08: Initial draft — comprehensive PRD covering all 9 sections with MVP scope for 1-week timeline
- 2026-02-08: Rev 2 — Renamed personas (Leanne, Alex, Leonore). Elevated Google Drive to P0 MVP as primary attachment storage (DB stores only file IDs, no physical files in Supabase). Confirmed Express.js API layer. Bilingual best-effort in MVP.
- 2026-02-08: Rev 3 — Resolved final open questions: item-ID-based Drive folder structure (files don't move when items relocate), admin's Drive as central household storage, Render free tier for Express.js hosting. 6/11 open questions now resolved.
