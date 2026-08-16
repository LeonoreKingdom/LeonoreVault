import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function createChain(resolver: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
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
let locationsChain = createChain(() => Promise.resolve({ data: [], error: null }));
const mockFrom = vi.fn((table: string) =>
  table === 'memberships' ? membershipChain : locationsChain,
);

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
const LOCATION_ID = '660e8400-e29b-41d4-a716-446655440001';
const CHILD_ID = '770e8400-e29b-41d4-a716-446655440002';
const USER_ID = '880e8400-e29b-41d4-a716-446655440003';

const rootLocation = {
  id: LOCATION_ID,
  household_id: HOUSEHOLD_ID,
  name: 'Living room',
  parent_id: null,
  description: 'Main living area',
  sort_order: 0,
};

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

describe('Storage location API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationsChain = createChain(() => Promise.resolve({ data: [], error: null }));
    (membershipChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/locations`)
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('returns the household location tree', async () => {
    mockAuth();
    locationsChain = createChain(() =>
      Promise.resolve({
        data: [
          rootLocation,
          { ...rootLocation, id: CHILD_ID, name: 'Media cabinet', parent_id: LOCATION_ID },
        ],
        error: null,
      }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/locations`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data.tree[0]).toMatchObject({
      id: LOCATION_ID,
      name: 'Living room',
      parentId: null,
      children: [expect.objectContaining({ id: CHILD_ID, name: 'Media cabinet' })],
    });
  });

  it('validates and creates a location', async () => {
    mockAuth();
    locationsChain = createChain(() => Promise.resolve({ data: rootLocation, error: null }));

    const invalid = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/locations`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: '' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const response = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/locations`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Living room', description: 'Main living area' })
      .expect(201);

    expect(response.body.data.location.name).toBe('Living room');
  });

  it('updates and deletes a location within the household', async () => {
    mockAuth();
    locationsChain = createChain(() => Promise.resolve({ data: rootLocation, error: null }));

    const updated = await request(app)
      .patch(`/api/households/${HOUSEHOLD_ID}/locations/${LOCATION_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Family room' })
      .expect(200);
    expect(updated.body.data.location.id).toBe(LOCATION_ID);

    locationsChain = createChain(() => Promise.resolve({ data: { id: LOCATION_ID }, error: null }));
    const deleted = await request(app)
      .delete(`/api/households/${HOUSEHOLD_ID}/locations/${LOCATION_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    expect(deleted.body.data).toEqual({ deleted: true, id: LOCATION_ID });
  });
});
