import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ─── Mock Supabase + env before importing app ────────────────

// Helper: create a chainable mock with a resolver at the end
function createChain(resolver: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.is = vi.fn(self);
  chain.not = vi.fn(self);
  chain.or = vi.fn(self);
  chain.ilike = vi.fn(self);
  chain.contains = vi.fn(self);
  chain.order = vi.fn(self);
  chain.range = vi.fn(resolver);
  chain.single = vi.fn(resolver);
  return chain;
}

const membershipChain = createChain(() =>
  Promise.resolve({ data: { role: 'admin' }, error: null }),
);
let itemsChain = createChain(() => Promise.resolve({ data: null, error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'memberships') return membershipChain;
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
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import app from '../../../index.js';
import { supabaseAdmin } from '../../../config/supabase.js';

const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const ITEM_ID = '660e8400-e29b-41d4-a716-446655440001';
const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const TS = '2025-01-01T00:00:00+00:00';

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

function mockAuthFailure() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: { message: 'Invalid token' },
  } as never);
}

const mockItem = {
  id: ITEM_ID,
  household_id: HOUSEHOLD_ID,
  name: 'Test Item',
  description: null,
  category_id: null,
  location_id: null,
  quantity: 1,
  tags: [],
  status: 'stored',
  created_by: USER_ID,
  borrowed_by: null,
  borrow_due_date: null,
  created_at: TS,
  updated_at: TS,
  deleted_at: null,
};

// ─── Tests ──────────────────────────────────────────────────

describe('Item API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset membership mock for each test
    (membershipChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
  });

  describe('GET /api/households/:id/items', () => {
    it('returns 401 without auth token', async () => {
      const res = await request(app)
        .get(`/api/households/${HOUSEHOLD_ID}/items`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 with invalid token', async () => {
      mockAuthFailure();

      const res = await request(app)
        .get(`/api/households/${HOUSEHOLD_ID}/items`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns items on successful auth', async () => {
      mockAuth();

      itemsChain = createChain(() =>
        Promise.resolve({ data: [mockItem], error: null, count: 1 }),
      );

      const res = await request(app)
        .get(`/api/households/${HOUSEHOLD_ID}/items`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toBe('Test Item');
    });
  });

  describe('POST /api/households/:id/items', () => {
    it('returns 401 without auth', async () => {
      await request(app)
        .post(`/api/households/${HOUSEHOLD_ID}/items`)
        .send({ name: 'New Item' })
        .expect(401);
    });

    it('returns 400 for invalid payload (empty name)', async () => {
      mockAuth();

      const res = await request(app)
        .post(`/api/households/${HOUSEHOLD_ID}/items`)
        .set('Authorization', 'Bearer valid-token')
        .send({ name: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('creates item with valid payload', async () => {
      mockAuth();

      itemsChain = createChain(() =>
        Promise.resolve({ data: mockItem, error: null }),
      );

      const res = await request(app)
        .post(`/api/households/${HOUSEHOLD_ID}/items`)
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test Item' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.item.name).toBe('Test Item');
    });
  });

  describe('DELETE /api/households/:id/items/:itemId', () => {
    it('returns 401 without auth', async () => {
      await request(app)
        .delete(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}`)
        .expect(401);
    });

    it('soft-deletes item with valid auth', async () => {
      mockAuth();

      itemsChain = createChain(() =>
        Promise.resolve({ error: null }),
      );

      const res = await request(app)
        .delete(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
