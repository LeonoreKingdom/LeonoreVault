import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ─── Mock Supabase + env before importing app ────────────────

vi.mock('../../../config/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
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

const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

// ─── Tests ──────────────────────────────────────────────────

describe('Sync API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/sync', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/sync')
        .send({
          householdId: HOUSEHOLD_ID,
          mutations: [],
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 if householdId is missing', async () => {
      mockAuth();

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ mutations: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('householdId');
    });

    it('returns 400 if mutations is not an array', async () => {
      mockAuth();

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ householdId: HOUSEHOLD_ID, mutations: 'not-array' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 if batch exceeds 100 mutations', async () => {
      mockAuth();

      const mutations = Array.from({ length: 101 }, (_, i) => ({
        type: 'update',
        table: 'items',
        entityId: `${i}`,
        payload: {},
        updatedAt: new Date().toISOString(),
      }));

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ householdId: HOUSEHOLD_ID, mutations })
        .expect(400);

      expect(res.body.error.message).toContain('100');
    });

    it('processes empty mutation batch successfully', async () => {
      mockAuth();

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({
          householdId: HOUSEHOLD_ID,
          mutations: [],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.applied).toEqual([]);
      expect(res.body.data.conflicts).toEqual([]);
    });

    it('returns error for unsupported table', async () => {
      mockAuth();

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', 'Bearer valid-token')
        .send({
          householdId: HOUSEHOLD_ID,
          mutations: [
            {
              type: 'create',
              table: 'unknown_table',
              entityId: '123',
              payload: {},
              updatedAt: new Date().toISOString(),
            },
          ],
        })
        .expect(200);

      expect(res.body.data.conflicts).toHaveLength(1);
      expect(res.body.data.conflicts[0].status).toBe('error');
      expect(res.body.data.conflicts[0].message).toContain('unknown_table');
    });
  });
});
