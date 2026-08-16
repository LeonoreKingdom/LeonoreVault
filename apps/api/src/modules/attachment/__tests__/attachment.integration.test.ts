import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

function createChain(
  resolver: () => Promise<unknown>,
  singleResolver: () => Promise<unknown> = resolver,
) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of ['select', 'insert', 'delete', 'eq', 'is', 'order', 'in']) {
    chain[method] = vi.fn(self);
  }
  chain.single = vi.fn(singleResolver);
  chain.maybeSingle = vi.fn(singleResolver);
  chain.then = vi.fn(
    (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolver().then(onfulfilled, onrejected),
  );
  return chain;
}

const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const ITEM_ID = '660e8400-e29b-41d4-a716-446655440001';
const USER_ID = '770e8400-e29b-41d4-a716-446655440002';

const membershipChain = createChain(() =>
  Promise.resolve({ data: { role: 'admin' }, error: null }),
);
let itemsChain = createChain(() => Promise.resolve({ data: { id: ITEM_ID }, error: null }));
let attachmentsChain = createChain(
  () => Promise.resolve({ data: null, error: null, count: 0 }),
  () =>
    Promise.resolve({
      data: {
        id: '880e8400-e29b-41d4-a716-446655440003',
        item_id: ITEM_ID,
        drive_file_id: `${HOUSEHOLD_ID}/${ITEM_ID}/photo.jpg`,
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg',
        thumbnail_url: 'https://storage.example/photo.jpg?width=200',
        web_view_link: 'https://storage.example/photo.jpg',
        created_by: USER_ID,
        created_at: '2025-01-01T00:00:00+00:00',
      },
      error: null,
    }),
);

const storageBucket = {
  upload: vi.fn(async () => ({ error: null })),
  getPublicUrl: vi.fn((path: string) => ({
    data: { publicUrl: `https://storage.example/${path}` },
  })),
  remove: vi.fn(async () => ({ error: null })),
};

const mockFrom = vi.fn((table: string) => {
  if (table === 'memberships') return membershipChain;
  if (table === 'items') return itemsChain;
  return attachmentsChain;
});

vi.mock('../../../config/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    storage: { from: vi.fn(() => storageBucket) },
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

describe('Item photo upload API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemsChain = createChain(() => Promise.resolve({ data: { id: ITEM_ID }, error: null }));
    attachmentsChain = createChain(
      () => Promise.resolve({ data: null, error: null, count: 0 }),
      () =>
        Promise.resolve({
          data: {
            id: '880e8400-e29b-41d4-a716-446655440003',
            item_id: ITEM_ID,
            drive_file_id: `${HOUSEHOLD_ID}/${ITEM_ID}/photo.jpg`,
            file_name: 'photo.jpg',
            mime_type: 'image/jpeg',
            thumbnail_url: 'https://storage.example/photo.jpg?width=200',
            web_view_link: 'https://storage.example/photo.jpg',
            created_by: USER_ID,
            created_at: '2025-01-01T00:00:00+00:00',
          },
          error: null,
        }),
    );
    (membershipChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
  });

  it('requires authentication', async () => {
    await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/attachments/upload`)
      .expect(401);
  });

  it('rejects an upload with no files', async () => {
    mockAuth();
    const response = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/attachments/upload`)
      .set('Authorization', 'Bearer valid-token')
      .expect(400);

    expect(response.body.error.code).toBe('NO_FILES');
  });

  it('accepts a JPEG photo and returns the created attachment', async () => {
    mockAuth();
    const response = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/attachments/upload`)
      .set('Authorization', 'Bearer valid-token')
      .attach('files', Buffer.from('jpeg bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(response.body.data[0]).toMatchObject({
      itemId: ITEM_ID,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
    });
    expect(storageBucket.upload).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported file types with a validation error', async () => {
    mockAuth();
    const response = await request(app)
      .post(`/api/households/${HOUSEHOLD_ID}/items/${ITEM_ID}/attachments/upload`)
      .set('Authorization', 'Bearer valid-token')
      .attach('files', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(response.body.error.code).toBe('UPLOAD_VALIDATION_ERROR');
    expect(storageBucket.upload).not.toHaveBeenCalled();
  });
});
