import { describe, it, expect } from 'vitest';
import {
  createHouseholdSchema,
  updateHouseholdSchema,
  joinHouseholdSchema,
  updateMemberRoleSchema,
} from '../household.schema.js';

describe('createHouseholdSchema', () => {
  it('accepts a valid name', () => {
    expect(createHouseholdSchema.parse({ name: 'My Household' })).toEqual({
      name: 'My Household',
    });
  });

  it('rejects empty name', () => {
    expect(() => createHouseholdSchema.parse({ name: '' })).toThrow();
  });

  it('rejects name longer than 100 chars', () => {
    expect(() => createHouseholdSchema.parse({ name: 'x'.repeat(101) })).toThrow();
  });

  it('rejects missing name', () => {
    expect(() => createHouseholdSchema.parse({})).toThrow();
  });
});

describe('updateHouseholdSchema', () => {
  it('accepts empty object', () => {
    expect(updateHouseholdSchema.parse({})).toEqual({});
  });

  it('accepts optional name', () => {
    expect(updateHouseholdSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
  });
});

describe('joinHouseholdSchema', () => {
  it('accepts valid 6-char uppercase alphanumeric invite code', () => {
    expect(joinHouseholdSchema.parse({ invite_code: 'ABC123' })).toEqual({
      invite_code: 'ABC123',
    });
  });

  it('rejects lowercase letters', () => {
    expect(() => joinHouseholdSchema.parse({ invite_code: 'abc123' })).toThrow();
  });

  it('rejects wrong length (5 chars)', () => {
    expect(() => joinHouseholdSchema.parse({ invite_code: 'ABC12' })).toThrow();
  });

  it('rejects wrong length (7 chars)', () => {
    expect(() => joinHouseholdSchema.parse({ invite_code: 'ABC1234' })).toThrow();
  });

  it('rejects special characters', () => {
    expect(() => joinHouseholdSchema.parse({ invite_code: 'ABC12!' })).toThrow();
  });
});

describe('updateMemberRoleSchema', () => {
  it('accepts valid roles', () => {
    expect(updateMemberRoleSchema.parse({ role: 'admin' }).role).toBe('admin');
    expect(updateMemberRoleSchema.parse({ role: 'member' }).role).toBe('member');
    expect(updateMemberRoleSchema.parse({ role: 'viewer' }).role).toBe('viewer');
  });

  it('rejects invalid role', () => {
    expect(() => updateMemberRoleSchema.parse({ role: 'superadmin' })).toThrow();
  });

  it('rejects missing role', () => {
    expect(() => updateMemberRoleSchema.parse({})).toThrow();
  });
});
