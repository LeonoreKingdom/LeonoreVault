import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

function createChain(resolver: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.update = vi.fn(self);
  chain.upsert = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.is = vi.fn(self);
  chain.order = vi.fn(self);
  chain.range = vi.fn(resolver);
  chain.single = vi.fn(resolver);
  chain.maybeSingle = vi.fn(resolver);
  chain.then = vi.fn(
    (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolver().then(onfulfilled, onrejected),
  );
  return chain;
}

const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const NOTIFICATION_ID = '880e8400-e29b-41d4-a716-446655440003';
const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const ITEM_ID = '660e8400-e29b-41d4-a716-446655440001';
const TS = '2025-01-01T00:00:00+00:00';

const mockNotification = {
  id: NOTIFICATION_ID,
  user_id: USER_ID,
  household_id: HOUSEHOLD_ID,
  item_id: ITEM_ID,
  notification_type: 'return_due_soon',
  title: 'Cordless drill is due soon',
  body: 'Return date is tomorrow.',
  data: { item_id: ITEM_ID },
  read_at: null,
  created_at: TS,
};

let notificationChain = createChain(() =>
  Promise.resolve({ data: [mockNotification], error: null, count: 1 }),
);

const mockFrom = vi.fn((table: string) => {
  if (table === 'notifications' || table === 'notification_preferences') {
    return notificationChain;
  }
  throw new Error(`Unexpected table: ${table}`);
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

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

describe('Notification API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationChain = createChain(() =>
      Promise.resolve({ data: [mockNotification], error: null, count: 1 }),
    );
  });

  describe('GET /api/notifications', () => {
    it('returns 401 without auth token', async () => {
      await request(app).get('/api/notifications').expect(401);
    });

    it('returns the authenticated user notifications with pagination', async () => {
      mockAuth();

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toEqual([
        {
          id: NOTIFICATION_ID,
          userId: USER_ID,
          householdId: HOUSEHOLD_ID,
          itemId: ITEM_ID,
          notificationType: 'return_due_soon',
          title: 'Cordless drill is due soon',
          body: 'Return date is tomorrow.',
          data: { item_id: ITEM_ID },
          readAt: null,
          createdAt: TS,
        },
      ]);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(notificationChain.eq).toHaveBeenCalledWith('user_id', USER_ID);
      expect(notificationChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(notificationChain.range).toHaveBeenCalledWith(0, 19);
    });

    it('supports unread-only pagination', async () => {
      mockAuth();

      await request(app)
        .get('/api/notifications')
        .query({ unread_only: 'true', page: 2, limit: 5 })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(notificationChain.is).toHaveBeenCalledWith('read_at', null);
      expect(notificationChain.range).toHaveBeenCalledWith(5, 9);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks only the authenticated user notification as read', async () => {
      mockAuth();
      const readNotification = { ...mockNotification, read_at: '2025-01-02T00:00:00+00:00' };
      notificationChain = createChain(() =>
        Promise.resolve({ data: readNotification, error: null }),
      );

      const res = await request(app)
        .patch(`/api/notifications/${NOTIFICATION_ID}/read`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.readAt).toBe('2025-01-02T00:00:00+00:00');
      expect(notificationChain.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
      expect(notificationChain.eq).toHaveBeenCalledWith('id', NOTIFICATION_ID);
      expect(notificationChain.eq).toHaveBeenCalledWith('user_id', USER_ID);
    });

    it('returns 404 when the notification is not owned by the user', async () => {
      mockAuth();
      notificationChain = createChain(() => Promise.resolve({ data: null, error: null }));

      const res = await request(app)
        .patch(`/api/notifications/${NOTIFICATION_ID}/read`)
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('rejects an invalid notification id', async () => {
      mockAuth();

      const res = await request(app)
        .patch('/api/notifications/not-a-uuid/read')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    const preferences = {
      due_soon_enabled: true,
      overdue_enabled: false,
      returns_enabled: true,
      item_updates_enabled: false,
      household_activity_enabled: true,
      weekly_summary_enabled: false,
      pause_all: false,
    };

    it('returns 401 without auth token', async () => {
      await request(app).put('/api/notifications/preferences').send(preferences).expect(401);
    });

    it('upserts preferences for the authenticated user', async () => {
      mockAuth();
      const savedPreferences = {
        user_id: USER_ID,
        ...preferences,
        updated_at: '2025-01-02T00:00:00+00:00',
      };
      notificationChain = createChain(() =>
        Promise.resolve({ data: savedPreferences, error: null }),
      );

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', 'Bearer valid-token')
        .send(preferences)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.preferences).toEqual({
        userId: USER_ID,
        dueSoonEnabled: true,
        overdueEnabled: false,
        returnsEnabled: true,
        itemUpdatesEnabled: false,
        householdActivityEnabled: true,
        weeklySummaryEnabled: false,
        pauseAll: false,
        updatedAt: '2025-01-02T00:00:00+00:00',
      });
      expect(notificationChain.upsert).toHaveBeenCalledWith(
        { user_id: USER_ID, ...preferences },
        { onConflict: 'user_id' },
      );
    });

    it('rejects incomplete preference payloads', async () => {
      mockAuth();

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', 'Bearer valid-token')
        .send({ due_soon_enabled: true })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
