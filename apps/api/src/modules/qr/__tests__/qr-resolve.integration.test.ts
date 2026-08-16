import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function createChain(resolver: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  for (const method of ['select', 'eq', 'is']) {
    chain[method] = vi.fn(self);
  }
  chain.single = vi.fn(resolver);
  chain.maybeSingle = vi.fn(resolver);
  chain.then = vi.fn(
    (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolver().then(onfulfilled, onrejected),
  );
  return chain;
}

const membershipChain = createChain(() =>
  Promise.resolve({ data: { role: 'admin' }, error: null }),
);
let itemsChain = createChain(() => Promise.resolve({ data: null, error: null }));
let spotsChain = createChain(() => Promise.resolve({ data: null, error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'memberships') return membershipChain;
  if (table === 'storage_spots') return spotsChain;
  return itemsChain;
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

const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const ITEM_ID = '660e8400-e29b-41d4-a716-446655440001';
const SPOT_ID = '770e8400-e29b-41d4-a716-446655440002';
const USER_ID = '880e8400-e29b-41d4-a716-446655440003';
const ITEM_TOKEN = '0123456789abcdef0123456789abcdef';
const SPOT_TOKEN = 'fedcba9876543210fedcba9876543210';
const TS = '2025-01-01T00:00:00+00:00';

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

describe('QR resolve API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemsChain = createChain(() => Promise.resolve({ data: null, error: null }));
    spotsChain = createChain(() => Promise.resolve({ data: null, error: null }));
    (membershipChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/qr/resolve`)
      .query({ token: ITEM_TOKEN })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('rejects malformed QR tokens before querying resources', async () => {
    mockAuth();

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/qr/resolve`)
      .query({ token: 'not-a-token' })
      .set('Authorization', 'Bearer valid-token')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(itemsChain.maybeSingle).not.toHaveBeenCalled();
    expect(spotsChain.maybeSingle).not.toHaveBeenCalled();
  });

  it('resolves an item token within the household', async () => {
    mockAuth();
    itemsChain = createChain(() =>
      Promise.resolve({
        data: {
          id: ITEM_ID,
          qr_token: ITEM_TOKEN,
          name: 'Camera',
          description: 'Mirrorless camera',
          category_id: null,
          location_id: null,
          storage_spot_id: null,
          quantity: 1,
          tags: ['travel'],
          status: 'stored',
          borrowed_by: null,
          borrow_due_date: null,
          updated_at: TS,
        },
        error: null,
      }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/qr/resolve`)
      .query({ token: ITEM_TOKEN })
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data).toEqual({
      type: 'item',
      item: {
        id: ITEM_ID,
        qrToken: ITEM_TOKEN,
        name: 'Camera',
        description: 'Mirrorless camera',
        categoryId: null,
        locationId: null,
        storageSpotId: null,
        quantity: 1,
        tags: ['travel'],
        status: 'stored',
        borrowedBy: null,
        borrowDueDate: null,
        updatedAt: TS,
      },
    });
  });

  it('resolves a storage spot token within the household', async () => {
    mockAuth();
    spotsChain = createChain(() =>
      Promise.resolve({
        data: {
          id: SPOT_ID,
          qr_token: SPOT_TOKEN,
          name: 'Top shelf',
          parent_id: null,
          spot_type: 'shelf',
          description: null,
          capacity: 10,
          sort_order: 0,
          updated_at: TS,
        },
        error: null,
      }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/qr/resolve`)
      .query({ token: SPOT_TOKEN })
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data).toEqual({
      type: 'spot',
      storageSpot: {
        id: SPOT_ID,
        qrToken: SPOT_TOKEN,
        name: 'Top shelf',
        parentId: null,
        spotType: 'shelf',
        description: null,
        capacity: 10,
        sortOrder: 0,
        updatedAt: TS,
      },
    });
  });

  it('returns a not-found error when the token is not in the household', async () => {
    mockAuth();

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/qr/resolve`)
      .query({ token: ITEM_TOKEN })
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body.error.code).toBe('QR_NOT_FOUND');
  });
});
