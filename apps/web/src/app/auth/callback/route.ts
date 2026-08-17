import { NextResponse } from 'next/server';

/**
 * GET /auth/callback
 * Better Auth redirects here after completing the provider callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestedNext = searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/';
  return NextResponse.redirect(`${origin}${next}`);
}
