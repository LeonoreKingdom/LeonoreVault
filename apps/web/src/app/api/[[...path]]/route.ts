import { handleExpressRequest } from '@leonorevault/api/next-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handleExpressRequest;
export const POST = handleExpressRequest;
export const PUT = handleExpressRequest;
export const PATCH = handleExpressRequest;
export const DELETE = handleExpressRequest;
export const HEAD = handleExpressRequest;
export const OPTIONS = handleExpressRequest;
