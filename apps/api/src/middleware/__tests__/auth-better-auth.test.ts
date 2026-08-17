import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findMembership: vi.fn(),
}));

vi.mock('../../config/better-auth.js', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:3000',
    LOG_LEVEL: 'info',
    TURSO_DATABASE_URL: 'file:./test.db',
  },
}));

vi.mock('../../db/repositories/runtime.js', () => ({
  getInventoryRepositories: vi.fn(async () => ({
    memberships: { findByUserAndHousehold: mocks.findMembership },
  })),
}));

import { requireAuth, requireRole } from '../auth.js';

function request(headers: Record<string, string> = {}): Request {
  return { headers, params: {} } as unknown as Request;
}

describe('Better Auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches the Better Auth user from the request session', async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    const req = request({ authorization: 'Bearer session-token' });
    const next = vi.fn() as unknown as NextFunction;

    await requireAuth(req, {} as Response, next);

    expect(req.user).toEqual({ id: 'user-1', email: 'user@example.com' });
    expect(next).toHaveBeenCalledWith();
    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });

  it('rejects a request without a valid Better Auth session', async () => {
    mocks.getSession.mockResolvedValue(null);
    const next = vi.fn() as unknown as NextFunction;

    await requireAuth(request({ authorization: 'Bearer expired' }), {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  });

  it('enforces household membership roles through the repository', async () => {
    mocks.findMembership.mockResolvedValue({ role: 'admin' });
    const req = request({ authorization: 'Bearer session-token' });
    req.user = { id: 'user-1', email: 'user@example.com' };
    req.params = { householdId: 'household-1' };
    const next = vi.fn() as unknown as NextFunction;

    await requireRole(['admin'], 'householdId')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(mocks.findMembership).toHaveBeenCalledWith('user-1', 'household-1');
  });
});
