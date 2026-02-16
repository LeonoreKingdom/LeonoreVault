# LeonoreVault Deployment Guide

Deploy the Next.js frontend to **Vercel**, the Express API to **Render**, and the database to **Supabase Cloud**.

---

## Prerequisites

- GitHub repo with the LeonoreVault monorepo pushed
- Accounts on [Supabase](https://supabase.com), [Vercel](https://vercel.com), [Render](https://render.com)
- Google Cloud Console project with OAuth 2.0 credentials

---

## Step 1: Supabase Cloud

### 1.1 Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name it `leonorevault`, choose a region, set a strong DB password
3. Wait for provisioning (~2 min)

### 1.2 Push Database Schema

From your local repo root:

```bash
# Link to your cloud project
npx supabase link --project-ref <PROJECT_REF>
# You'll be prompted for the DB password you set above

# Push all migrations to cloud
npx supabase db push
```

> Your `<PROJECT_REF>` is in the URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`

### 1.3 Enable Google OAuth Provider

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable**
3. Paste your `Client ID` and `Client Secret` from Google Cloud Console
4. Note the **Callback URL** shown (looks like `https://<ref>.supabase.co/auth/v1/callback`) — you'll need it for Google

### 1.4 Collect Keys

From **Settings → API**, copy:

| Key                 | Environment Variable            |
| ------------------- | ------------------------------- |
| Project URL         | `NEXT_PUBLIC_SUPABASE_URL`      |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key  | `SUPABASE_SERVICE_ROLE_KEY`     |

From **Settings → Database → Connection string → URI**:
| Key | Environment Variable |
|-----|---------------------|
| Connection string (URI) | `DATABASE_URL` |

> ⚠️ Replace `[YOUR-PASSWORD]` in the connection string with your actual DB password.

---

## Step 2: Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Edit your **OAuth 2.0 Client ID** (or create one if you haven't)
3. Under **Authorized redirect URIs**, add:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   https://your-app.vercel.app
   ```
5. Save and copy `Client ID` + `Client Secret`

---

## Step 3: Deploy API to Render

### 3.1 Create Web Service

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting            | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| **Name**           | `leonorevault-api`                                                        |
| **Region**         | Same as Supabase                                                          |
| **Root Directory** | `apps/api`                                                                |
| **Runtime**        | Node                                                                      |
| **Build Command**  | `cd ../.. && pnpm install --frozen-lockfile && cd apps/api && pnpm build` |
| **Start Command**  | `node dist/index.js`                                                      |
| **Plan**           | Free (or Starter for no cold starts)                                      |

> The build command goes to monorepo root first because `pnpm install` needs the workspace `pnpm-lock.yaml`.

### 3.2 Environment Variables

Add these in Render's **Environment** tab:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/auth/callback
ENCRYPTION_KEY=<generate-a-random-64-char-hex-string>
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 Deploy

Click **Create Web Service**. Wait for the first build (~3-5 min).

Once deployed, note your API URL: `https://leonorevault-api.onrender.com`

Test: `https://leonorevault-api.onrender.com/health` should return OK.

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Import Project

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo
3. Configure:

| Setting              | Value      |
| -------------------- | ---------- |
| **Framework Preset** | Next.js    |
| **Root Directory**   | `apps/web` |

### 4.2 Environment Variables

Add in Vercel's **Environment Variables** section:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://leonorevault-api.onrender.com
```

### 4.3 Build Settings

Vercel should auto-detect Next.js. If the build fails due to monorepo, set:

| Setting             | Value                                        |
| ------------------- | -------------------------------------------- |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Build Command**   | `pnpm build`                                 |

### 4.4 Deploy

Click **Deploy**. Once live, note your URL: `https://your-app.vercel.app`

---

## Step 5: Post-Deployment Updates

After both services are live, update the cross-references:

### 5.1 Update Render's CORS

In Render → Environment Variables:

```
CORS_ORIGIN=https://your-app.vercel.app
```

Redeploy the API.

### 5.2 Update Google OAuth

In Google Cloud Console, ensure redirect URIs include:

```
https://<ref>.supabase.co/auth/v1/callback
```

And authorized JavaScript origins include:

```
https://your-app.vercel.app
```

### 5.3 Custom Domain (Optional)

- **Vercel**: Settings → Domains → Add your domain
- **Render**: Settings → Custom Domain
- If you add a custom domain, update `CORS_ORIGIN` and Google OAuth URIs accordingly

---

## Environment Variables Summary

### Render (API)

| Variable                        | Source                     |
| ------------------------------- | -------------------------- |
| `NODE_ENV`                      | `production`               |
| `PORT`                          | `4000`                     |
| `CORS_ORIGIN`                   | Your Vercel URL            |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Dashboard         |
| `DATABASE_URL`                  | Supabase Dashboard         |
| `GOOGLE_CLIENT_ID`              | Google Cloud Console       |
| `GOOGLE_CLIENT_SECRET`          | Google Cloud Console       |
| `GOOGLE_REDIRECT_URI`           | Your Vercel callback URL   |
| `ENCRYPTION_KEY`                | Self-generated (32+ chars) |

### Vercel (Frontend)

| Variable                        | Source             |
| ------------------------------- | ------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard |
| `NEXT_PUBLIC_API_URL`           | Your Render URL    |

---

## Troubleshooting

### API returns 502 on Render

- Check Render logs for startup errors
- Most common: missing environment variables — `env.ts` will log which ones are missing

### CORS errors in browser

- Verify `CORS_ORIGIN` on Render matches your exact Vercel URL (no trailing slash)

### Google OAuth fails

- Ensure the Supabase callback URL is in Google's authorized redirect URIs
- Check that Google provider is enabled in Supabase Auth settings

### Render cold starts (free tier)

- Free tier services spin down after 15 min of inactivity
- First request after cold start takes ~30 seconds
- Fix: upgrade to Starter plan ($7/mo) for always-on

### Monorepo build issues

- If Render can't find shared packages, ensure the build command starts from the monorepo root
- Vercel: enable "Include files outside root directory" in project settings if needed

### Database migrations

- Always run `npx supabase db push` after adding new migrations
- Check migration status: `npx supabase migration list`
