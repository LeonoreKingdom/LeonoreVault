import { describe, it, expect } from 'vitest';
import { uuidSchema, timestampSchema, userSchema, userProfileSchema, updateProfileSchema } from '../user.schema.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TS = '2025-01-01T00:00:00+00:00';

describe('uuidSchema', () => {
  it('accepts a valid UUID', () => {
    expect(uuidSchema.parse(VALID_UUID)).toBe(VALID_UUID);
  });

  it('rejects non-UUID strings', () => {
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
    expect(() => uuidSchema.parse('')).toThrow();
    expect(() => uuidSchema.parse(123)).toThrow();
  });
});

describe('timestampSchema', () => {
  it('accepts ISO 8601 datetime with offset', () => {
    expect(timestampSchema.parse(VALID_TS)).toBe(VALID_TS);
    expect(timestampSchema.parse('2025-12-31T23:59:59+07:00')).toBeDefined();
  });

  it('rejects plain dates and invalid timestamps', () => {
    expect(() => timestampSchema.parse('2025-01-01')).toThrow();
    expect(() => timestampSchema.parse('not-a-date')).toThrow();
  });
});

describe('userSchema', () => {
  const valid = {
    id: VALID_UUID,
    email: 'user@example.com',
    display_name: 'Alice',
    avatar_url: 'https://example.com/avatar.png',
    created_at: VALID_TS,
    updated_at: VALID_TS,
  };

  it('accepts a complete valid user', () => {
    expect(userSchema.parse(valid)).toEqual(valid);
  });

  it('allows nullable display_name and avatar_url', () => {
    const result = userSchema.parse({ ...valid, display_name: null, avatar_url: null });
    expect(result.display_name).toBeNull();
    expect(result.avatar_url).toBeNull();
  });

  it('rejects invalid email', () => {
    expect(() => userSchema.parse({ ...valid, email: 'bad' })).toThrow();
  });

  it('rejects display_name longer than 100 chars', () => {
    expect(() => userSchema.parse({ ...valid, display_name: 'x'.repeat(101) })).toThrow();
  });
});

describe('userProfileSchema', () => {
  it('omits updated_at field', () => {
    const input = {
      id: VALID_UUID,
      email: 'user@example.com',
      display_name: 'Alice',
      avatar_url: null,
      created_at: VALID_TS,
    };
    const result = userProfileSchema.parse(input);
    expect(result).not.toHaveProperty('updated_at');
  });
});

describe('updateProfileSchema', () => {
  it('accepts valid display_name', () => {
    expect(updateProfileSchema.parse({ display_name: 'Bob' })).toEqual({ display_name: 'Bob' });
  });

  it('accepts empty object (no changes)', () => {
    expect(updateProfileSchema.parse({})).toEqual({});
  });

  it('rejects empty display_name', () => {
    expect(() => updateProfileSchema.parse({ display_name: '' })).toThrow();
  });
});
