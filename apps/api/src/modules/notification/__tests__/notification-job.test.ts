import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runOverdueReminderJob } from '../notification.service.js';

function createChain(resolver: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of ['select', 'is', 'not', 'lt', 'eq', 'in']) {
    chain[method] = vi.fn(self);
  }
  chain.insert = vi.fn(self);
  chain.then = vi.fn(
    (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolver().then(onfulfilled, onrejected),
  );
  return chain;
}

const HOUSEHOLD_ID = '550e8400-e29b-41d4-a716-446655440000';
const ITEM_ID = '660e8400-e29b-41d4-a716-446655440001';
const BORROW_RECORD_ID = '770e8400-e29b-41d4-a716-446655440002';
const USER_ONE_ID = '880e8400-e29b-41d4-a716-446655440003';
const USER_TWO_ID = '990e8400-e29b-41d4-a716-446655440004';
const DUE_AT = '2025-01-31T00:00:00.000Z';

let borrowRecordsChain = createChain(() =>
  Promise.resolve({
    data: [
      {
        id: BORROW_RECORD_ID,
        item_id: ITEM_ID,
        household_id: HOUSEHOLD_ID,
        borrowed_by: USER_ONE_ID,
        due_at: DUE_AT,
        items: { name: 'Portable projector' },
      },
    ],
    error: null,
  }),
);
let membershipsChain = createChain(() =>
  Promise.resolve({ data: [{ user_id: USER_ONE_ID }, { user_id: USER_TWO_ID }], error: null }),
);
let preferencesChain = createChain(() => Promise.resolve({ data: [], error: null }));
let notificationsChain = createChain(() => Promise.resolve({ error: null }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'borrow_records') return borrowRecordsChain;
  if (table === 'memberships') return membershipsChain;
  if (table === 'notification_preferences') return preferencesChain;
  if (table === 'notifications') return notificationsChain;
  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('../../../config/supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: { NODE_ENV: 'test' },
}));

vi.mock('../../../middleware/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn(), fatal: vi.fn() },
}));

describe('Overdue reminder job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    borrowRecordsChain = createChain(() =>
      Promise.resolve({
        data: [
          {
            id: BORROW_RECORD_ID,
            item_id: ITEM_ID,
            household_id: HOUSEHOLD_ID,
            borrowed_by: USER_ONE_ID,
            due_at: DUE_AT,
            items: { name: 'Portable projector' },
          },
        ],
        error: null,
      }),
    );
    membershipsChain = createChain(() =>
      Promise.resolve({ data: [{ user_id: USER_ONE_ID }, { user_id: USER_TWO_ID }], error: null }),
    );
    preferencesChain = createChain(() => Promise.resolve({ data: [], error: null }));
    notificationsChain = createChain(() => Promise.resolve({ error: null }));
  });

  it('creates overdue notifications for recipients with default preferences', async () => {
    const result = await runOverdueReminderJob(new Date('2025-02-02T00:00:00.000Z'));

    expect(result).toEqual({
      overdueRecords: 1,
      notificationsCreated: 2,
      duplicatesSkipped: 0,
    });
    expect(borrowRecordsChain.lt).toHaveBeenCalledWith('due_at', '2025-02-02T00:00:00.000Z');
    expect(notificationsChain.insert).toHaveBeenCalledTimes(2);
    expect(notificationsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ONE_ID,
        notification_type: 'return_overdue',
        title: 'Portable projector is overdue',
        data: expect.objectContaining({ borrowRecordId: BORROW_RECORD_ID }),
      }),
    );
  });

  it('counts database duplicate errors without aborting the job', async () => {
    notificationsChain = createChain(() =>
      Promise.resolve({
        error: { code: '23505', message: 'duplicate overdue reminder' },
      }),
    );

    const result = await runOverdueReminderJob(new Date('2025-02-02T00:00:00.000Z'));

    expect(result).toEqual({
      overdueRecords: 1,
      notificationsCreated: 0,
      duplicatesSkipped: 2,
    });
  });

  it('does not notify recipients who disabled overdue reminders', async () => {
    preferencesChain = createChain(() =>
      Promise.resolve({
        data: [
          { user_id: USER_ONE_ID, overdue_enabled: false, pause_all: false },
          { user_id: USER_TWO_ID, overdue_enabled: true, pause_all: true },
        ],
        error: null,
      }),
    );

    const result = await runOverdueReminderJob(new Date('2025-02-02T00:00:00.000Z'));

    expect(result.notificationsCreated).toBe(0);
    expect(notificationsChain.insert).not.toHaveBeenCalled();
  });
});
