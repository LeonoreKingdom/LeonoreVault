import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => {
  const createChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['select', 'insert', 'update', 'eq', 'limit', 'order']) {
      chain[method] = vi.fn(() => chain);
    }
    chain.single = vi.fn();
    chain.then = vi.fn();
    return chain;
  };

  return {
    membershipsChain: createChain(),
    householdsChain: createChain(),
    supabaseAdmin: {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    },
  };
});

vi.mock('../../../config/supabase.js', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    PORT: 3000,
    NODE_ENV: 'test',
    CORS_ORIGIN: '*',
  },
}));

vi.mock('../../../middleware/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import app from '../../../index.js';

const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const HOUSEHOLD_ID = '880e8400-e29b-41d4-a716-446655440003';
const MEMBERSHIP_ID = '990e8400-e29b-41d4-a716-446655440004';
const TS = '2025-01-01T00:00:00+00:00';

const household = {
  id: HOUSEHOLD_ID,
  name: 'Casa Leonore',
  created_by: USER_ID,
  created_at: TS,
};

const membership = {
  id: MEMBERSHIP_ID,
  user_id: USER_ID,
  household_id: HOUSEHOLD_ID,
  role: 'admin',
  joined_at: TS,
};

function mockAuth() {
  mocks.supabaseAdmin.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: 'leonore@example.com' } },
    error: null,
  });
}

describe('Household API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membershipsChain.single!.mockReset();
    mocks.householdsChain.single!.mockReset();
    mocks.membershipsChain.then!.mockReset();
    mocks.householdsChain.then!.mockReset();
    mocks.supabaseAdmin.from.mockImplementation((table: string) =>
      table === 'memberships' ? mocks.membershipsChain : mocks.householdsChain,
    );
    mocks.membershipsChain.then!.mockImplementation(
      (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected),
    );
    mocks.householdsChain.then!.mockImplementation(
      (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected),
    );
  });

  it('creates a household and admin membership', async () => {
    mockAuth();
    mocks.membershipsChain
      .single!.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: membership, error: null });
    mocks.householdsChain.single!.mockResolvedValue({ data: household, error: null });

    const response = await request(app)
      .post('/api/households')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Casa Leonore' })
      .expect(201);

    expect(response.body.data).toEqual({
      household: {
        id: HOUSEHOLD_ID,
        name: 'Casa Leonore',
        createdBy: USER_ID,
        inviteCode: null,
        inviteExpiresAt: null,
        driveFolderId: null,
        createdAt: TS,
      },
      membership: {
        id: MEMBERSHIP_ID,
        userId: USER_ID,
        householdId: HOUSEHOLD_ID,
        role: 'admin',
        joinedAt: TS,
      },
    });
    expect(mocks.householdsChain.insert).toHaveBeenCalledWith({
      name: 'Casa Leonore',
      created_by: USER_ID,
    });
    expect(mocks.membershipsChain.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      household_id: HOUSEHOLD_ID,
      role: 'admin',
    });
  });

  it('lists only households belonging to the current user', async () => {
    mockAuth();
    mocks.membershipsChain.then!.mockImplementation(
      (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: [
            {
              ...membership,
              households: {
                id: HOUSEHOLD_ID,
                name: 'Casa Leonore',
                created_by: USER_ID,
                created_at: TS,
              },
            },
          ],
          error: null,
        }).then(onfulfilled, onrejected),
    );

    const response = await request(app)
      .get('/api/households')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data.households).toEqual([
      {
        household: {
          id: HOUSEHOLD_ID,
          name: 'Casa Leonore',
          createdBy: USER_ID,
          inviteCode: null,
          inviteExpiresAt: null,
          driveFolderId: null,
          createdAt: TS,
        },
        membership: {
          id: MEMBERSHIP_ID,
          userId: USER_ID,
          householdId: HOUSEHOLD_ID,
          role: 'admin',
          joinedAt: TS,
        },
      },
    ]);
    expect(mocks.membershipsChain.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mocks.membershipsChain.order).toHaveBeenCalledWith('joined_at', { ascending: false });
  });

  it('generates a seven-day invite for an administrator', async () => {
    mockAuth();
    mocks.membershipsChain.single!.mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
    mocks.householdsChain.then!.mockImplementation(
      (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected),
    );

    const response = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/invite`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(mocks.householdsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        invite_code: response.body.data.inviteCode,
        invite_expires_at: response.body.data.expiresAt,
      }),
    );
  });

  it('accepts a valid invite and creates a member membership', async () => {
    mockAuth();
    mocks.membershipsChain
      .single!.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { ...membership, role: 'member' }, error: null });
    mocks.householdsChain.single!.mockResolvedValue({
      data: {
        ...household,
        invite_code: 'XK9M2P',
        invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    });

    const response = await request(app)
      .post('/api/households/join')
      .set('Authorization', 'Bearer valid-token')
      .send({ invite_code: 'XK9M2P' })
      .expect(200);

    expect(response.body.data.membership.role).toBe('member');
    expect(response.body.data.household.id).toBe(HOUSEHOLD_ID);
    expect(mocks.householdsChain.eq).toHaveBeenCalledWith('invite_code', 'XK9M2P');
    expect(mocks.membershipsChain.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      household_id: HOUSEHOLD_ID,
      role: 'member',
    });
  });
});
