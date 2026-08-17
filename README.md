# LeonoreVault
Inventory Management Web Application

## Production stack

- Web: Next.js on Vercel
- API: Next.js App Router route handlers on Vercel, reusing the typed domain modules
- Database: Turso libSQL/SQLite through Drizzle ORM
- Files: Cloudflare R2 through its S3-compatible API
- Edge protection: Cloudflare WAF rate limiting

Google is used only for optional OAuth. Google Drive, Supabase, and Render are
not runtime dependencies. The old-service migration scripts under
`apps/api/scripts/` are one-time import tooling only and are not loaded by the
application.

## Local development

Copy `.env.example` to `.env`, set the Turso and Better Auth values, then run:

```bash
pnpm install
pnpm --filter @leonorevault/api db:migrate
pnpm dev
```

Next.js is the only development server and owns the same-origin `/api` route
handlers, matching the single-project Vercel deployment. The Express modules
remain an internal compatibility adapter for endpoints still being migrated;
they no longer run as a separate server.
