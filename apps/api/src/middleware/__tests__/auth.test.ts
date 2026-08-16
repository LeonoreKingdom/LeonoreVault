import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mocks = vi.hoisted(() => {
  const membershipChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  membershipChain.select.mockReturnValue(membershipChain);
  membershipChain.eq.mockReturnValue(membershipChain);

  return {
    membershipChain,
    supabaseAdmin: {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => membershipChain),
    },
  };
});

vi.mock('../../config/supabase.js', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { requireAuth, requireRole } from '../auth.js';

const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const HOUSEHOLD_ID = '880e8400-e29b-41d4-a716-446655440003';

function nextMock() {
  return vi.fn();
}

describe('authentication and membership middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membershipChain.single.mockReset();
  });

  it('rejects missing and malformed bearer headers without logging headers', async () => {
    const next = nextMock();

    await requireAuth({ headers: {} } as Request, {} as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('attaches the Supabase user for a valid bearer token', async () => {
    mocks.supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'leonore@example.com' } },
      error: null,
    });
    const request = { headers: { authorization: 'Bearer access-token' } } as Request;
    const next = nextMock();

    await requireAuth(request, {} as Response, next as unknown as NextFunction);

    expect(request.user).toEqual({ id: USER_ID, email: 'leonore@example.com' });
    expect(next).toHaveBeenCalledWith();
    expect(mocks.supabaseAdmin.auth.getUser).toHaveBeenCalledWith('access-token');
  });

  it('allows only the configured membership roles', async () => {
    mocks.membershipChain.single.mockResolvedValue({
      data: { role: 'member' },
      error: null,
    });
    const next = nextMock();

    await requireRole(['admin'], 'householdId')(
      {
        user: { id: USER_ID, email: 'leonore@example.com' },
        params: { householdId: HOUSEHOLD_ID },
      } as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns an internal error when membership lookup fails', async () => {
    mocks.membershipChain.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'database unavailable' },
    });
    const next = nextMock();

    await requireRole(['member'], 'householdId')(
      {
        user: { id: USER_ID, email: 'leonore@example.com' },
        params: { householdId: HOUSEHOLD_ID },
      } as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
