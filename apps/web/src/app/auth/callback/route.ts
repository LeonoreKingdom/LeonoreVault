import { NextResponse } from 'next/server';

/**
 * GET /auth/callback
 * Local mock callback. The real Better Auth callback will replace this route
 * once the authentication backend is connected.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestedNext = searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/';
  return NextResponse.redirect(`${origin}${next}`);
}
