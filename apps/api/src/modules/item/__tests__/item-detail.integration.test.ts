import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function createChain(resolver: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  for (const method of ['select', 'eq', 'is', 'order', 'limit']) {
    chain[method] = vi.fn(self);
  }
  chain.single = vi.fn(resolver);
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
let attachmentsChain = createChain(() => Promise.resolve({ data: [], error: null }));
let activitiesChain = createChain(() => Promise.resolve({ data: [], error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'memberships') return membershipChain;
  if (table === 'attachments') return attachmentsChain;
  if (table === 'item_activities') return activitiesChain;
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
const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const TS = '2025-01-01T00:00:00+00:00';

const item = {
  id: ITEM_ID,
  household_id: HOUSEHOLD_ID,
  qr_token: '0123456789abcdef0123456789abcdef',
  name: 'Camera',
  description: 'Mirrorless camera',
  category_id: null,
  location_id: null,
  storage_spot_id: null,
  quantity: 1,
  tags: ['travel'],
  status: 'stored',
  created_by: USER_ID,
  borrowed_by: null,
  borrow_due_date: null,
  created_at: TS,
  updated_at: TS,
  deleted_at: null,
};

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  } as never);
}

describe('Item detail API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemsChain = createChain(() => Promise.resolve({ data: null, error: null }));
    attachmentsChain = createChain(() => Promise.resolve({ data: [], error: null }));
    activitiesChain = createChain(() => Promise.resolve({ data: [], error: null }));
    (membershipChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
  });

  it('requires authentication', async () => {
    await request(app).get(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}`).expect(401);
  });

  it('returns the item and its attachments for the household', async () => {
    mockAuth();
    itemsChain = createChain(() => Promise.resolve({ data: item, error: null }));
    attachmentsChain = createChain(() =>
      Promise.resolve({
        data: [
          {
            id: '880e8400-e29b-41d4-a716-446655440003',
            item_id: ITEM_ID,
            drive_file_id: 'storage/camera.jpg',
            file_name: 'camera.jpg',
            mime_type: 'image/jpeg',
            thumbnail_url: null,
            web_view_link: 'https://example.com/camera.jpg',
            created_by: USER_ID,
            created_at: TS,
          },
        ],
        error: null,
      }),
    );
    activitiesChain = createChain(() =>
      Promise.resolve({
        data: [
          {
            id: '990e8400-e29b-41d4-a716-446655440004',
            item_id: ITEM_ID,
            user_id: USER_ID,
            action: 'created',
            details: { source: 'onboarding' },
            created_at: TS,
            user: { display_name: 'Leonore', avatar_url: 'https://example.com/avatar.png' },
          },
        ],
        error: null,
      }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.data.item).toEqual({
      id: ITEM_ID,
      householdId: HOUSEHOLD_ID,
      qrToken: item.qr_token,
      name: 'Camera',
      description: 'Mirrorless camera',
      categoryId: null,
      locationId: null,
      storageSpotId: null,
      quantity: 1,
      tags: ['travel'],
      status: 'stored',
      createdBy: USER_ID,
      borrowedBy: null,
      borrowDueDate: null,
      createdAt: TS,
      updatedAt: TS,
      deletedAt: null,
    });
    expect(response.body.data.attachments).toEqual([
      {
        id: '880e8400-e29b-41d4-a716-446655440003',
        itemId: ITEM_ID,
        driveFileId: 'storage/camera.jpg',
        fileName: 'camera.jpg',
        mimeType: 'image/jpeg',
        thumbnailUrl: null,
        webViewLink: 'https://example.com/camera.jpg',
        createdBy: USER_ID,
        createdAt: TS,
      },
    ]);
    expect(response.body.data.recentActivity).toEqual([
      {
        id: '990e8400-e29b-41d4-a716-446655440004',
        itemId: ITEM_ID,
        userId: USER_ID,
        action: 'created',
        details: { source: 'onboarding' },
        createdAt: TS,
        user: { displayName: 'Leonore', avatarUrl: 'https://example.com/avatar.png' },
      },
    ]);
    expect(itemsChain.eq).toHaveBeenCalledWith('household_id', HOUSEHOLD_ID);
    expect(itemsChain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(attachmentsChain.eq).toHaveBeenCalledWith('item_id', ITEM_ID);
    expect(activitiesChain.eq).toHaveBeenCalledWith('item_id', ITEM_ID);
    expect(activitiesChain.limit).toHaveBeenCalledWith(20);
  });

  it('returns not found for an item outside the household', async () => {
    mockAuth();
    itemsChain = createChain(() => Promise.resolve({ data: null, error: null }));

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(attachmentsChain.single).not.toHaveBeenCalled();
  });

  it('returns an internal error when attachment loading fails', async () => {
    mockAuth();
    itemsChain = createChain(() => Promise.resolve({ data: item, error: null }));
    attachmentsChain = createChain(() =>
      Promise.resolve({ data: null, error: { message: 'attachments unavailable' } }),
    );

    const response = await request(app)
      .get(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(500);

    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});
