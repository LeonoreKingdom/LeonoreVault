import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function createChain(
  resolver: () => Promise<unknown>,
  maybeSingleResolver: () => Promise<unknown> = resolver,
) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  for (const method of ['select', 'eq', 'is', 'order']) {
    chain[method] = vi.fn(self);
  }
  chain.single = vi.fn(resolver);
  chain.maybeSingle = vi.fn(maybeSingleResolver);
  chain.then = vi.fn(
    (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolver().then(onfulfilled, onrejected),
  );
  return chain;
}

const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const SPOT_ID = '660e8400-e29b-41d4-a716-446655440001';
const CHILD_ID = '770e8400-e29b-41d4-a716-446655440002';
const ITEM_ID = '880e8400-e29b-41d4-a716-446655440003';
const USER_ID = '990e8400-e29b-41d4-a716-446655440004';
const TS = '2025-01-01T00:00:00+00:00';

const spot = {
  id: SPOT_ID,
  household_id: HOUSEHOLD_ID,
  qr_token: '0123456789abcdef0123456789abcdef',
  name: 'Hall cabinet',
  parent_id: null,
  spot_type: 'cabinet',
  description: 'Frequently used items',
  capacity: 12,
  sort_order: 0,
  created_at: TS,
  updated_at: TS,
};

const membershipChain = createChain(() =>
  Promise.resolve({ data: { role: 'admin' }, error: null }),
);
let storageSpotsChain = createChain(
  () => Promise.resolve({ data: [], error: null }),
  () => Promise.resolve({ data: spot, error: null }),
);
let itemsChain = createChain(() => Promise.resolve({ data: [], error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'memberships') return membershipChain;
  if (table === 'items') return itemsChain;
  return storageSpotsChain;
});

vi.mock('../../../config/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    PORT: 3000,
    NODE_ENV: 'test',
    CORS_ORIGIN: '*',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
  },
}));

vi.mock('../../../middleware/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import app from '../../../index.js';
import { supabaseAdmin } from '../../../config/supabase.js';

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

describe('Storage spot contents API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageSpotsChain = createChain(
      () => Promise.resolve({ data: [], error: null }),
      () => Promise.resolve({ data: spot, error: null }),
    );
    itemsChain = createChain(() => Promise.resolve({ data: [], error: null }));
    (membershipChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
  });

  it('requires authentication', async () => {
    await request(app).get(`/api/households/${HOUSEHOLD_ID}/storage-spots/${SPOT_ID}`).expect(401);
  });

  it('returns the spot, child spots, and active items in the household', async () => {
    mockAuth();
    storageSpotsChain = createChain(
      () =>
        Promise.resolve({
          data: [
            {
              ...spot,
              id: CHILD_ID,
              qr_token: 'fedcba9876543210fedcba9876543210',
              name: 'Top shelf',
              parent_id: SPOT_ID,
              spot_type: 'shelf',
            },
          ],
          error: null,
        }),
      () => Promise.resolve({ data: spot, error: null }),
    );
    itemsChain = createChain(() =>
      Promise.resolve({
        data: [
          {
            id: ITEM_ID,
            qr_token: 'abcdef0123456789abcdef0123456789',
            name: 'Camera',
            description: null,
            category_id: null,
            location_id: null,
            storage_spot_id: SPOT_ID,
            quantity: 1,
            tags: ['travel'],
            status: 'stored',
            borrowed_by: null,
            borrow_due_date: null,
            updated_at: TS,
          },
        ],
        error: null,
      }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/storage-spots/${SPOT_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data.storageSpot.qrToken).toBe(spot.qr_token);
    expect(response.body.data.children[0]).toMatchObject({
      id: CHILD_ID,
      qrToken: 'fedcba9876543210fedcba9876543210',
      parentId: SPOT_ID,
      name: 'Top shelf',
    });
    expect(response.body.data.items).toEqual([
      {
        id: ITEM_ID,
        qrToken: 'abcdef0123456789abcdef0123456789',
        name: 'Camera',
        description: null,
        categoryId: null,
        locationId: null,
        storageSpotId: SPOT_ID,
        quantity: 1,
        tags: ['travel'],
        status: 'stored',
        borrowedBy: null,
        borrowDueDate: null,
        updatedAt: TS,
      },
    ]);
    expect(storageSpotsChain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID);
    expect(itemsChain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID);
    expect(itemsChain.eq).toHaveBeenCalledWith('storage_spot_id', SPOT_ID);
    expect(itemsChain.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('returns not found without querying spot contents', async () => {
    mockAuth();
    storageSpotsChain = createChain(
      () => Promise.resolve({ data: [], error: null }),
      () => Promise.resolve({ data: null, error: null }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/storage-spots/${SPOT_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(storageSpotsChain.then).not.toHaveBeenCalled();
    expect(itemsChain.then).not.toHaveBeenCalled();
  });
});
