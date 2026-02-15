import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_ACTIONS,
  MAX_HIERARCHY_DEPTH,
  MAX_ATTACHMENTS_PER_ITEM,
  MAX_TAGS_PER_ITEM,
  MAX_TAG_LENGTH,
  INVITE_CODE_LENGTH,
  INVITE_CODE_EXPIRY_HOURS,
  SOFT_DELETE_RETENTION_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../defaults.js';

describe('ACTIVITY_ACTIONS', () => {
  it('is a non-empty array', () => {
    expect(ACTIVITY_ACTIONS.length).toBeGreaterThan(0);
  });

  it('includes expected actions', () => {
    expect(ACTIVITY_ACTIONS).toContain('created');
    expect(ACTIVITY_ACTIONS).toContain('updated');
    expect(ACTIVITY_ACTIONS).toContain('moved');
    expect(ACTIVITY_ACTIONS).toContain('status_changed');
  });
});

describe('Numeric constants', () => {
  it('MAX_HIERARCHY_DEPTH is a positive number', () => {
    expect(MAX_HIERARCHY_DEPTH).toBeGreaterThan(0);
  });

  it('MAX_ATTACHMENTS_PER_ITEM is a positive number', () => {
    expect(MAX_ATTACHMENTS_PER_ITEM).toBeGreaterThan(0);
  });

  it('MAX_TAGS_PER_ITEM is a positive number', () => {
    expect(MAX_TAGS_PER_ITEM).toBeGreaterThan(0);
  });

  it('MAX_TAG_LENGTH is a positive number', () => {
    expect(MAX_TAG_LENGTH).toBeGreaterThan(0);
  });

  it('INVITE_CODE_LENGTH is 6', () => {
    expect(INVITE_CODE_LENGTH).toBe(6);
  });

  it('INVITE_CODE_EXPIRY_HOURS is 48', () => {
    expect(INVITE_CODE_EXPIRY_HOURS).toBe(48);
  });

  it('SOFT_DELETE_RETENTION_DAYS is 30', () => {
    expect(SOFT_DELETE_RETENTION_DAYS).toBe(30);
  });

  it('DEFAULT_PAGE_SIZE <= MAX_PAGE_SIZE', () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });
});
