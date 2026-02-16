# LeonoreVault — Startup Guide

Everything you need to run LeonoreVault locally for the first time.

---

## Prerequisites

| Tool                 | Required       | You Have       |
| -------------------- | -------------- | -------------- |
| Node.js ≥ 20         | ✅             | v22.17.1 ✅    |
| pnpm ≥ 9             | ✅             | 9.15.9 ✅      |
| Docker Desktop       | ✅             | Installed ✅   |
| Google Cloud Console | ✅ (for OAuth) | ❓ Needs setup |

> [!NOTE]
> No global Supabase CLI install needed — all commands use `npx supabase` which downloads it on demand.

---

## Step 1: Install Dependencies

```powershell
cd d:\LeonoreKingdom\Project\Development\Web Development\LeonoreVault
pnpm install
```

---

## Step 2: Start Supabase Locally

> [!IMPORTANT]
> Docker Desktop must be running before this step.

```powershell
npx supabase start
```

> [!NOTE]
> **Windows users:** Analytics has been disabled in `supabase/config.toml` because it requires Docker TCP exposure on Windows. This is cosmetic — the app works fine without it. You may see a "Stopped services" warning for analytics/vector/imgproxy — this is safe to ignore.

This takes a few minutes on first run (pulls Docker images). When finished, it prints credentials:

```
API URL:     http://127.0.0.1:54321
anon key:    eyJ...
service_role key: eyJ...
DB URL:      postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:  http://127.0.0.1:54323
```

**Copy these values** — you'll need them for the `.env` file.

The command also:

- Runs all 14 migrations (creates tables, RLS, triggers)
- Seeds the database with test data (3 users, 1 household, 5 items, categories, locations)

### Verify with Studio

Open **http://127.0.0.1:54323** in your browser. You should see the Supabase Studio dashboard with your tables.

---

## Step 3: Set Up Google OAuth

This is required for login (the app uses Google OAuth via Supabase Auth).

### 3a. Create Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:54321/auth/v1/callback` (Supabase local auth)
   - `http://localhost:3000/auth/callback` (Next.js app)
7. Copy the **Client ID** and **Client Secret**

### 3b. Enable Google Auth in Supabase

Go to **Supabase Studio** → **Authentication** → **Providers** → **Google**:

1. Enable the Google provider
2. Paste your **Client ID** and **Client Secret**
3. Save

> [!TIP]
> This step is done via the Studio UI when running locally. For a hosted Supabase project, use the Supabase Dashboard.

---

## Step 4: Create the `.env` File

Create a file at _the repository root_ called `.env`:

```powershell
# From the project root
Copy-Item .env.example .env
```

Then fill it in with your values:

```env
# ─── Server ──────────────────────────────────────────────────
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# ─── Supabase (these are the local dev keys from supabase start) ─
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# ─── Google OAuth (from Google Cloud Console) ────────────────
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# ─── Encryption (generate a random 32+ char string) ─────────
ENCRYPTION_KEY=local-dev-encryption-key-change-in-production-min32chars

# ─── Frontend ────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> [!CAUTION]
> Never commit `.env` to git. It's already gitignored.

---

## Step 5: Start the App

### Option A — Start everything (recommended)

```powershell
pnpm dev
```

This runs the API (port 4000) and Web (port 3000) in parallel.

### Option B — Start individually

```powershell
# Terminal 1: API
pnpm dev:api

# Terminal 2: Web
pnpm dev:web
```

### Verify

| Service         | URL                          | What to check                |
| --------------- | ---------------------------- | ---------------------------- |
| Web             | http://localhost:3000        | Login page loads             |
| API             | http://localhost:4000/health | Returns `{ "status": "ok" }` |
| Supabase Studio | http://localhost:54323       | Tables visible               |

---

## Step 6: Test the App

1. Open **http://localhost:3000**
2. Click **Sign in with Google** (uses the credentials you set up in Step 3)
3. After login, you'll be redirected to the household setup page
4. Create or join a household (the seed has invite code `TEST01`)
5. Browse items, create/edit/delete, test sync indicator

### Seed Data Available

After `supabase start`, these are loaded:

| Entity     | Count | Notes                                                               |
| ---------- | ----- | ------------------------------------------------------------------- |
| Users      | 3     | leonore@example.com (admin), member@example.com, viewer@example.com |
| Households | 1     | "Casa Leonore"                                                      |
| Categories | 5     | Documents, Electronics + sub-categories                             |
| Locations  | 5     | Master Bedroom, Living Room + sub-locations                         |
| Items      | 6     | 5 active + 1 soft-deleted                                           |

> [!NOTE]
> Seed users exist in the `public.users` table, but **not** in `auth.users`. You must sign in via Google OAuth, which creates a real auth user and auto-provisions a `public.users` row via the auth trigger.

---

## Quick Reference

| Command                 | What it does                    |
| ----------------------- | ------------------------------- |
| `pnpm dev`              | Start API + Web in parallel     |
| `pnpm dev:api`          | Start API only (port 4000)      |
| `pnpm dev:web`          | Start Web only (port 3000)      |
| `pnpm test`             | Run all tests                   |
| `pnpm typecheck`        | Typecheck all packages          |
| `npx supabase start`    | Start local Supabase (Docker)   |
| `npx supabase stop`     | Stop local Supabase             |
| `npx supabase db reset` | Re-run all migrations + seed    |
| `npx supabase status`   | Show local Supabase URLs + keys |

---

## Things Not Yet Set Up

The following items need your attention before you can run the app:

- [ ] **Docker Desktop running** — required for local Supabase
- [ ] **`npx supabase start`** — creates DB, runs migrations, gives you keys
- [ ] **Google Cloud OAuth credentials** — Client ID + Secret
- [ ] **Enable Google auth in Supabase Studio** — paste credentials
- [ ] **`.env` file** — copy from `.env.example` and fill in values
- [ ] **`pnpm install`** — if not already done

---

## Troubleshooting

### `supabase start` fails with "unhealthy" analytics container

- This is a known Windows issue — analytics requires Docker TCP exposure
- **Fix:** Set `enabled = false` in `supabase/config.toml` under `[analytics]` (already done)
- Clean up leftover containers: `docker rm -f $(docker ps -aq --filter "name=supabase")`
- Then retry: `npx supabase start`

### `supabase start` fails with "container name already in use"

- Leftover containers from a previous failed start
- Run: `npx supabase stop --no-backup` then `npx supabase start`
- If that fails: `docker rm -f $(docker ps -aq --filter "name=supabase")` then `npx supabase start`

### API fails with "Invalid environment variables"

- Check that `.env` is at the repo root (not inside `apps/api/`)
- Ensure all required vars are filled in (no placeholder values)
- Running `npx supabase status` will re-display the keys

### Google OAuth redirect error

- Verify the redirect URI in Google Console matches exactly: `http://localhost:54321/auth/v1/callback`
- Ensure Google provider is enabled in Supabase Studio → Auth → Providers

### Web shows blank page / network errors

- Confirm API is running (`http://localhost:4000/health`)
- Check `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env`
- Check browser console for CORS errors
