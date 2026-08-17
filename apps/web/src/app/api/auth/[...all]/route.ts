import { toNextJsHandler } from 'better-auth/next-js';
import { handleExpressRequest } from '@leonorevault/api/next-handler';
import { getAuthService } from '@/lib/server/next-services';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep the existing response envelope available to older clients while the
// browser uses Better Auth's canonical sign-in/sign-up endpoints.
const legacyAuthPaths = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
]);

function isLegacyAuthRequest(request: Request): boolean {
  return legacyAuthPaths.has(new URL(request.url).pathname);
}

async function getHandler(request: Request) {
  if (isLegacyAuthRequest(request)) return handleExpressRequest(request);
  const auth = await getAuthService();
  return toNextJsHandler(auth).GET(request);
}

async function postHandler(request: Request) {
  if (isLegacyAuthRequest(request)) return handleExpressRequest(request);
  const auth = await getAuthService();
  return toNextJsHandler(auth).POST(request);
}

export const GET = getHandler;
export const POST = postHandler;
