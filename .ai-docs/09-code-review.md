# Production Readiness Code Review

**Reviewed:** 2026-02-16
**Scope:** `apps/api`, `apps/web`, `packages/shared`, CI/CD config
**Overall Assessment:** Good foundation with several issues that must be addressed before production.

---

## Summary

| Severity    | Count |
| ----------- | ----- |
| 🔴 Critical | 3     |
| 🟠 High     | 8     |
| 🟡 Medium   | 8     |
| 🔵 Low      | 6     |

---

## 🔴 Critical

### CR-01 · SQL injection via search `ilike` filter

**Location:** `apps/api/src/modules/item/item.service.ts` L54
**Category:** Security

The `search` parameter is interpolated directly into a PostgREST `or()` filter string without escaping special characters (`%`, `_`, `\`). An attacker can craft search strings that alter query semantics.

```typescript
// ❌ Current (injectable)
if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
```

```typescript
// ✅ Fix: escape PostgREST special characters
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, (c) => `\\${c}`);
}

if (search) {
  const safe = escapeIlike(search);
  q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
}
```

---

### CR-02 · Sync mutations not validated on the server

**Location:** `apps/api/src/modules/sync/sync.controller.ts` L10-19
**Category:** Security

The sync endpoint casts `req.body` with `as` but performs no schema validation on individual mutations. An attacker can send malicious payloads (arbitrary fields injected into the DB insert/update):

```typescript
// ❌ Current — trusts client payloads blindly
const { householdId, mutations } = req.body as { ... };
```

```typescript
// ✅ Fix: create a Zod schema in @leonorevault/shared
import { z } from 'zod';

const syncMutationSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  table: z.literal('items'),
  entityId: z.string().uuid(),
  payload: z.record(z.unknown()),
  updatedAt: z.string().datetime(),
});

const syncBatchSchema = z.object({
  householdId: z.string().uuid(),
  mutations: z.array(syncMutationSchema).max(100),
});

// Then in the controller:
const parsed = syncBatchSchema.parse(req.body);
```

---

### CR-03 · Sync batch is not transactional (partial writes on failure)

**Location:** `apps/api/src/modules/sync/sync.service.ts` L58-97
**Category:** Bugs & Logic

Each mutation in a sync batch is processed sequentially with independent DB calls. If the 50th mutation fails, the first 49 are already committed. This leaves the database in an inconsistent state.

```typescript
// ✅ Fix: wrap the batch in a Supabase SQL transaction via rpc()
// Alternatively, use the Supabase JS transaction helper, or at minimum
// document this as a known limitation and add idempotency keys.
```

---

## 🟠 High

### CR-04 · Non-null assertion on `user.email`

**Location:** `apps/api/src/middleware/auth.ts` L55
**Category:** Bugs & Logic

Supabase users can exist without an email (e.g., phone-only auth). The `!` assertion will silently pass `undefined`, causing downstream issues.

```typescript
// ❌ Current
email: user.email!,
```

```typescript
// ✅ Fix
email: user.email ?? '',
// Or throw if email is truly required:
if (!user.email) throw new AppError(401, 'Account has no email', 'UNAUTHORIZED');
```

---

### CR-05 · `householdId` in sync controller not validated as UUID

**Location:** `apps/api/src/modules/sync/sync.controller.ts` L21
**Category:** Security

The `householdId` is passed directly to Supabase queries. While PostgREST won't execute SQL injection on UUID columns, a malformed ID can cause cryptic Supabase errors instead of a clean 400.

```typescript
// ✅ Fix: validate with Zod (covered by CR-02's schema) or a simple regex
import { uuidSchema } from '@leonorevault/shared';
```

---

### CR-06 · `mapItem()` duplicated across two services

**Location:** `apps/api/src/modules/item/item.service.ts` L14-32, `apps/api/src/modules/sync/sync.service.ts` L25-43
**Category:** Code Quality (DRY)

Identical `mapItem()` function is copy-pasted in two files. Changes to one will silently diverge from the other.

```typescript
// ✅ Fix: extract to a shared utility
// apps/api/src/utils/mappers.ts
export function mapItem(row: Record<string, unknown>) { ... }
```

---

### CR-07 · `as never` type assertion hides type errors

**Location:** `apps/api/src/modules/sync/sync.service.ts` L127
**Category:** TypeScript

The `as never` cast bypasses all type checking on the insert payload. If column names change in the DB schema, this will produce a runtime error instead of a compile-time error.

```typescript
// ❌ Current
.insert(insertData as never)
```

```typescript
// ✅ Fix: use a properly typed insert object (define a type matching the DB table)
import type { Database } from '@leonorevault/shared';
type ItemInsert = Database['public']['Tables']['items']['Insert'];
const insertData: ItemInsert = { ... };
```

---

### CR-08 · No rate limiting on API endpoints

**Location:** `apps/api/src/index.ts`
**Category:** Security

No rate limiter is present. The sync endpoint (heavy DB writes) and auth endpoints are particularly vulnerable to abuse.

```typescript
// ✅ Fix: add express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
});

app.use('/api', limiter);

// Stricter limiter for sync
const syncLimiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use('/api/sync', syncLimiter);
```

---

### CR-09 · `app.listen()` called at module level — blocks testing

**Location:** `apps/api/src/index.ts` L47-51
**Category:** Code Quality

The server starts listening on import. The tests currently work because they mock env, but this makes it impossible to test the app without binding a port.

```typescript
// ✅ Fix: only listen when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(env.PORT, () => { ... });
}
export default app;
```

---

### CR-10 · XHR upload in `apiUpload` never cleaned up

**Location:** `apps/web/src/lib/api.ts` L83-114
**Category:** Performance / Memory Leak

The `XMLHttpRequest` is never aborted if the component unmounts. In React, this can cause state updates on unmounted components.

```typescript
// ✅ Fix: accept an AbortSignal or return an abort handle
export function apiUpload<T>(
  path: string,
  formData: FormData,
  opts?: { onProgress?: (p: number) => void; signal?: AbortSignal },
): Promise<T> {
  // ...
  if (opts?.signal) {
    opts.signal.addEventListener('abort', () => xhr.abort());
  }
}
```

---

### CR-11 · `res.json()` called unconditionally (may throw on non-JSON errors)

**Location:** `apps/web/src/lib/api.ts` L41
**Category:** Error Handling

If the API returns a non-JSON response (e.g., HTML 502 from a reverse proxy), `res.json()` will throw a cryptic parsing error.

```typescript
// ✅ Fix: check content-type before parsing
const contentType = res.headers.get('content-type') ?? '';
if (!contentType.includes('application/json')) {
  throw new Error(`Request failed (${res.status})`);
}
const json = await res.json();
```

---

## 🟡 Medium

### CR-12 · Sync auto-retry loop can trigger continuously

**Location:** `apps/web/src/hooks/useSync.ts` L167-171
**Category:** Bugs & Logic (Race Condition)

The effect triggers `syncNow()` when `isOnline && pendingCount > 0`. If sync fails (network flicker) and items remain in the queue, `pendingCount` stays > 0, causing an infinite retry loop with no backoff.

```typescript
// ✅ Fix: add exponential backoff and max retry count
useEffect(() => {
  if (isOnline && pendingCount > 0 && !isSyncing) {
    const delay = Math.min(1000 * 2 ** retryCount, 30000);
    const timer = setTimeout(syncNow, delay);
    return () => clearTimeout(timer);
  }
}, [isOnline, pendingCount]);
```

---

### CR-13 · Dexie polling interval (2s) is wasteful

**Location:** `apps/web/src/hooks/useSync.ts` L67
**Category:** Performance

Polling the IndexedDB every 2 seconds is unnecessary. Use Dexie's `liveQuery` or hook into the queue write operations instead.

```typescript
// ✅ Fix: use Dexie's observable API
import { useLiveQuery } from 'dexie-react-hooks';
const pendingCount = useLiveQuery(() => db.syncQueue.count(), [], 0);
```

---

### CR-14 · `createClient()` creates a new Supabase instance on every call

**Location:** `apps/web/src/lib/supabase.ts` L10-15
**Category:** Performance

Every `apiGet/apiPost` call creates a new Supabase client just to read the session token. This wastes memory and re-initializes auth state.

```typescript
// ✅ Fix: memoize the singleton
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
```

---

### CR-15 · Non-null assertions on environment variables

**Location:** `apps/web/src/lib/supabase.ts` L12-13
**Category:** TypeScript

Using `!` on `process.env.NEXT_PUBLIC_*` will silently cause runtime failures if the env var is missing. At minimum, add a runtime check.

```typescript
// ✅ Fix
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase env vars');
```

---

### CR-16 · `softDeleteItem` returns success even if zero rows matched

**Location:** `apps/api/src/modules/item/item.service.ts` L254-268
**Category:** Bugs & Logic

The `.update()` call does not use `.select().single()`, so it returns success even if the `eq('id', ...)` matched zero rows (item doesn't exist). The client receives `{ deleted: true }` for a non-existent item.

```typescript
// ✅ Fix: check affected rows or use .select().single()
const { data, error } = await supabaseAdmin
  .from('items')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', itemId)
  .eq('household_id', householdId)
  .is('deleted_at', null)
  .select('id')
  .single();

if (error || !data) throw new AppError(404, 'Item not found', 'NOT_FOUND');
```

---

### CR-17 · Offline `updateItem` / `updateStatus` silently uses `item!`

**Location:** `apps/web/src/stores/items.ts` L320, L366
**Category:** Bugs & Logic

After applying the optimistic update, `get().items.find()` may return `undefined` (e.g., if the item was filtered out by `applyCacheFilters`). The `!` assertion will pass `undefined` to the caller.

```typescript
// ✅ Fix
const item = get().items.find((i) => i.id === itemId);
if (!item) throw new Error('Item not found in local state');
return item;
```

---

### CR-18 · `ItemForm` doesn't enforce status transition rules

**Location:** `apps/web/src/components/items/ItemForm.tsx` L166-178
**Category:** Bugs & Logic

The edit form shows all statuses in the dropdown, including invalid transitions. The server will reject them, but the user gets a confusing error.

```typescript
// ✅ Fix: filter statuses by STATUS_TRANSITIONS[item.status]
{ITEM_STATUSES.filter((s) =>
  !isEdit || s === item.status || STATUS_TRANSITIONS[item.status as ItemStatus]?.includes(s as ItemStatus)
).map((s) => ( ... ))}
```

---

### CR-19 · Toast `setTimeout` never cleared on unmount

**Location:** `apps/web/src/components/Toast.tsx` L29-31
**Category:** Performance / Memory Leak

The 4-second auto-dismiss timer is set inside a Zustand action (not inside a React component), so it can never be cleaned up. If toasts are removed manually, the timer still fires and calls `set()` on a potentially stale reference.

```typescript
// ✅ Fix: store timer refs and clear on manual remove, or use a queue approach
addToast: (type, message) => {
  const id = crypto.randomUUID();
  const timer = setTimeout(() => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, 4000);
  set((s) => ({ toasts: [...s.toasts, { id, type, message, _timer: timer }] }));
},
removeToast: (id) => {
  set((s) => {
    const toast = s.toasts.find((t) => t.id === id);
    if (toast?._timer) clearTimeout(toast._timer);
    return { toasts: s.toasts.filter((t) => t.id !== id) };
  });
},
```

---

## 🔵 Low

### CR-20 · `API_URL` defined in multiple files

**Location:** `apps/web/src/stores/auth.ts` L46, `apps/web/src/lib/api.ts` L5, `apps/web/src/app/(app)/items/labels/page.tsx` L10, `apps/web/src/app/(app)/household/setup/page.tsx` L9
**Category:** Code Quality (DRY)

`process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'` appears in 4+ files. Extract to a shared constant.

```typescript
// ✅ Fix: apps/web/src/lib/config.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

---

### CR-21 · Missing `aria-label` on SyncIndicator button

**Location:** `apps/web/src/components/SyncIndicator.tsx` L43-52
**Category:** Accessibility

The button has no `aria-label`, so screen readers announce only "Offline" or "3 pending" without context.

```typescript
// ✅ Fix
<button
  aria-label={`Sync status: ${label}${canSync ? '. Click to sync now' : ''}`}
  ...
>
```

---

### CR-22 · Toast dismiss button missing `aria-label`

**Location:** `apps/web/src/components/Toast.tsx` L77-82
**Category:** Accessibility

```typescript
// ✅ Fix
<button
  onClick={() => removeToast(toast.id)}
  aria-label="Dismiss notification"
  ...
>
```

---

### CR-23 · Toast container missing ARIA live region

**Location:** `apps/web/src/components/Toast.tsx` L68
**Category:** Accessibility

Screen readers won't announce new toasts without a live region.

```typescript
// ✅ Fix
<div
  role="status"
  aria-live="polite"
  className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
>
```

---

### CR-24 · No `helmet` CSP configured

**Location:** `apps/api/src/index.ts` L21
**Category:** Security

`helmet()` is applied with defaults, but no Content Security Policy is configured. Add strict CSP headers in production.

---

### CR-25 · `render.yaml` is on `free` plan (cold starts)

**Location:** `render.yaml` L6
**Category:** Performance

The free tier has cold starts (~30-60s). The health check may fail during startup. Consider adding `minInstances: 1` when moving to production or documenting this trade-off.

---

## Priority Remediation Order

| Priority          | IDs                                             | Effort |
| ----------------- | ----------------------------------------------- | ------ |
| **Immediate**     | CR-01, CR-02, CR-04                             | 1h     |
| **Before launch** | CR-03, CR-05, CR-08, CR-11, CR-16               | 2h     |
| **Sprint 1**      | CR-06, CR-07, CR-09, CR-10, CR-12, CR-13, CR-14 | 3h     |
| **Backlog**       | CR-15, CR-17-CR-25                              | 2h     |
