import { describe, it, expect } from 'vitest';
import {
  ITEM_STATUSES,
  STATUS_CONFIG,
  STATUS_TRANSITIONS,
  type ItemStatus,
} from '../item-status.js';

describe('ITEM_STATUSES', () => {
  it('contains exactly 4 statuses', () => {
    expect(ITEM_STATUSES).toHaveLength(4);
  });

  it('includes all expected values', () => {
    expect(ITEM_STATUSES).toContain('stored');
    expect(ITEM_STATUSES).toContain('borrowed');
    expect(ITEM_STATUSES).toContain('lost');
    expect(ITEM_STATUSES).toContain('in_lost_found');
  });
});

describe('STATUS_CONFIG', () => {
  it('has an entry for every status', () => {
    for (const status of ITEM_STATUSES) {
      expect(STATUS_CONFIG[status]).toBeDefined();
      expect(STATUS_CONFIG[status].label).toBeTruthy();
      expect(STATUS_CONFIG[status].color).toBeTruthy();
    }
  });
});

describe('STATUS_TRANSITIONS', () => {
  it('has entries for every status', () => {
    for (const status of ITEM_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(STATUS_TRANSITIONS[status])).toBe(true);
    }
  });

  // Valid transitions
  const validCases: [ItemStatus, ItemStatus][] = [
    ['stored', 'borrowed'],
    ['stored', 'lost'],
    ['borrowed', 'stored'],
    ['borrowed', 'lost'],
    ['lost', 'in_lost_found'],
    ['lost', 'stored'],
    ['in_lost_found', 'stored'],
  ];

  it.each(validCases)('%s → %s is allowed', (from, to) => {
    expect(STATUS_TRANSITIONS[from]).toContain(to);
  });

  // Invalid transitions
  const invalidCases: [ItemStatus, ItemStatus][] = [
    ['stored', 'in_lost_found'],
    ['borrowed', 'in_lost_found'],
    ['in_lost_found', 'borrowed'],
    ['in_lost_found', 'lost'],
  ];

  it.each(invalidCases)('%s → %s is NOT allowed', (from, to) => {
    expect(STATUS_TRANSITIONS[from]).not.toContain(to);
  });

  it('no status can transition to itself', () => {
    for (const status of ITEM_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it('all transition targets are valid statuses', () => {
    for (const status of ITEM_STATUSES) {
      for (const target of STATUS_TRANSITIONS[status]) {
        expect(ITEM_STATUSES).toContain(target);
      }
    }
  });
});
