import { describe, it, expect } from 'vitest';
import { MEMBERSHIP_ROLES, ROLE_LABELS } from '../roles.js';

describe('MEMBERSHIP_ROLES', () => {
  it('contains exactly 3 roles', () => {
    expect(MEMBERSHIP_ROLES).toHaveLength(3);
  });

  it('includes viewer, member, admin', () => {
    expect(MEMBERSHIP_ROLES).toContain('viewer');
    expect(MEMBERSHIP_ROLES).toContain('member');
    expect(MEMBERSHIP_ROLES).toContain('admin');
  });
});

describe('ROLE_LABELS', () => {
  it('has a label for every role', () => {
    for (const role of MEMBERSHIP_ROLES) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe('string');
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it('has expected labels', () => {
    expect(ROLE_LABELS.viewer).toBe('Viewer');
    expect(ROLE_LABELS.member).toBe('Member');
    expect(ROLE_LABELS.admin).toBe('Admin');
  });
});
