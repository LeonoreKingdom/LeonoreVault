import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function createChain(
  resolver: () => Promise<unknown>,
  singleResolver: () => Promise<unknown> = resolver,
  maybeSingleResolver: () => Promise<unknown> = singleResolver,
) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'is',
    'contains',
    'order',
    'limit',
  ]) {
    chain[method] = vi.fn(self);
  }
  chain.single = vi.fn(singleResolver);
  chain.maybeSingle = vi.fn(maybeSingleResolver);
  chain.then = vi.fn(
    (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolver().then(onfulfilled, onrejected),
  );
  return chain;
}

const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const ITEM_ID = '660e8400-e29b-41d4-a716-446655440001';
const BORROWER_ID = '770e8400-e29b-41d4-a716-446655440002';
const ACTOR_ID = '880e8400-e29b-41d4-a716-446655440003';
const OTHER_MEMBER_ID = '990e8400-e29b-41d4-a716-446655440004';

let itemsChain = createChain(() => Promise.resolve({ data: null, error: null }));
let membershipsChain = createChain(() => Promise.resolve({ data: null, error: null }));
let borrowRecordsChain = createChain(() => Promise.resolve({ data: null, error: null }));
let activitiesChain = createChain(() => Promise.resolve({ data: null, error: null }));
let notificationsChain = createChain(() => Promise.resolve({ data: null, error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'memberships') return membershipsChain;
  if (table === 'borrow_records') return borrowRecordsChain;
  if (table === 'item_activities') return activitiesChain;
  if (table === 'notifications') return notificationsChain;
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

const baseItem = {
  id: ITEM_ID,
  household_id: HOUSEHOLD_ID,
  name: 'Cordless drill',
  description: null,
  category_id: null,
  location_id: null,
  storage_spot_id: null,
  quantity: 1,
  tags: [],
  status: 'stored',
  created_by: ACTOR_ID,
  borrowed_by: null,
  borrow_due_date: null,
  created_at: '2025-01-01T00:00:00+00:00',
  updated_at: '2025-01-01T00:00:00+00:00',
  deleted_at: null,
};

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: ACTOR_ID, email: 'actor@example.com' } },
    error: null,
  } as never);
}

describe('Item checkout, return, and activity API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemsChain = createChain(
      () => Promise.resolve({ data: null, error: null }),
      () => Promise.resolve({ data: baseItem, error: null }),
      () => Promise.resolve({ data: { id: ITEM_ID }, error: null }),
    );
    membershipsChain = createChain(
      () => Promise.resolve({ data: null, error: null }),
      () => Promise.resolve({ data: { role: 'admin' }, error: null }),
      () => Promise.resolve({ data: { user_id: BORROWER_ID }, error: null }),
    );
    borrowRecordsChain = createChain(
      () => Promise.resolve({ data: null, error: null }),
      () =>
        Promise.resolve({
          data: { id: '990e8400-e29b-41d4-a716-446655440004' },
          error: null,
        }),
      () =>
        Promise.resolve({
          data: { id: '990e8400-e29b-41d4-a716-446655440004' },
          error: null,
        }),
    );
    activitiesChain = createChain(() => Promise.resolve({ error: null }));
    notificationsChain = createChain(() => Promise.resolve({ error: null }));
  });

  it('checks out an item and creates a borrow record and activity', async () => {
    mockAuth();
    const response = await request(app)
      .patch(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/status`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        status: 'borrowed',
        borrowed_by: BORROWER_ID,
        borrow_due_date: '2025-02-01T00:00:00+00:00',
        note: 'Weekend project',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(borrowRecordsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: ITEM_ID,
        household_id: HOUSEHOLD_ID,
        borrowed_by: BORROWER_ID,
        due_at: '2025-02-01T00:00:00+00:00',
        note: 'Weekend project',
      }),
    );
    expect(activitiesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'status_changed', item_id: ITEM_ID, user_id: ACTOR_ID }),
    );
  });

  it('rejects checkout when the item already has an active checkout', async () => {
    mockAuth();
    itemsChain = createChain(
      () => Promise.resolve({ data: null, error: null }),
      () =>
        Promise.resolve({
          data: { ...baseItem, status: 'borrowed', borrowed_by: BORROWER_ID },
          error: null,
        }),
    );

    const response = await request(app)
      .patch(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/status`)
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'borrowed', borrowed_by: BORROWER_ID })
      .expect(409);

    expect(response.body.error).toEqual(expect.objectContaining({ code: 'ALREADY_CHECKED_OUT' }));
    expect(borrowRecordsChain.insert).not.toHaveBeenCalled();
    expect(itemsChain.update).not.toHaveBeenCalled();
    expect(activitiesChain.insert).not.toHaveBeenCalled();
  });

  it('returns a borrowed item and closes its active borrow record', async () => {
    mockAuth();
    itemsChain = createChain(
      () => Promise.resolve({ data: null, error: null }),
      () =>
        Promise.resolve({
          data: { ...baseItem, status: 'borrowed', borrowed_by: BORROWER_ID },
          error: null,
        }),
    );

    const response = await request(app)
      .patch(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/status`)
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'stored' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(borrowRecordsChain.update).toHaveBeenCalledWith({ returned_at: expect.any(String) });
    expect(notificationsChain.delete).toHaveBeenCalled();
    expect(notificationsChain.eq).toHaveBeenCalledWith('item_id', ITEM_ID);
    expect(notificationsChain.eq).toHaveBeenCalledWith('notification_type', 'return_overdue');
    expect(notificationsChain.contains).toHaveBeenCalledWith('data', {
      borrowRecordId: '990e8400-e29b-41d4-a716-446655440004',
    });
    expect(activitiesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'status_changed', item_id: ITEM_ID, user_id: ACTOR_ID }),
    );
  });

  it('returns a borrowed item through the dedicated return endpoint', async () => {
    mockAuth();
    membershipsChain = createChain(
      () =>
        Promise.resolve({
          data: [{ user_id: BORROWER_ID }, { user_id: OTHER_MEMBER_ID }, { user_id: ACTOR_ID }],
          error: null,
        }),
      () => Promise.resolve({ data: { role: 'admin' }, error: null }),
      () => Promise.resolve({ data: { user_id: BORROWER_ID }, error: null }),
    );
    itemsChain = createChain(
      () => Promise.resolve({ data: null, error: null }),
      () =>
        Promise.resolve({
          data: { ...baseItem, status: 'borrowed', borrowed_by: BORROWER_ID },
          error: null,
        }),
    );

    const response = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/return`)
      .set('Authorization', 'Bearer valid-token')
      .send({ note: 'Returned after use' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(borrowRecordsChain.update).toHaveBeenCalledWith({ returned_at: expect.any(String) });
    expect(activitiesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'status_changed',
        item_id: ITEM_ID,
        user_id: ACTOR_ID,
        details: expect.objectContaining({ newStatus: 'stored' }),
      }),
    );
    expect(notificationsChain.insert).toHaveBeenCalledWith([
      {
        user_id: BORROWER_ID,
        household_id: HOUSEHOLD_ID,
        item_id: ITEM_ID,
        notification_type: 'item_returned',
        title: 'Cordless drill was returned',
        body: 'A household member marked this item as returned.',
        data: {
          itemId: ITEM_ID,
          returnedBy: ACTOR_ID,
          borrowedBy: BORROWER_ID,
          note: 'Returned after use',
        },
      },
      {
        user_id: OTHER_MEMBER_ID,
        household_id: HOUSEHOLD_ID,
        item_id: ITEM_ID,
        notification_type: 'item_returned',
        title: 'Cordless drill was returned',
        body: 'A household member marked this item as returned.',
        data: {
          itemId: ITEM_ID,
          returnedBy: ACTOR_ID,
          borrowedBy: BORROWER_ID,
          note: 'Returned after use',
        },
      },
    ]);
  });

  it('returns the item activity history', async () => {
    mockAuth();
    activitiesChain = createChain(() =>
      Promise.resolve({
        data: [
          {
            id: 'aa0e8400-e29b-41d4-a716-446655440005',
            item_id: ITEM_ID,
            user_id: ACTOR_ID,
            action: 'status_changed',
            details: { newStatus: 'borrowed' },
            created_at: '2025-01-01T00:00:00+00:00',
          },
        ],
        error: null,
      }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/activities`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data.activities).toEqual([
      expect.objectContaining({
        itemId: ITEM_ID,
        userId: ACTOR_ID,
        action: 'status_changed',
      }),
    ]);
  });
});
