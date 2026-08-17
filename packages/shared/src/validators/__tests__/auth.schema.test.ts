import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
} from '../auth.schema.js';

describe('registerSchema', () => {
  it('accepts a strong password and optional name', () => {
    expect(
      registerSchema.parse({
        email: 'leonore@example.com',
        password: 'Strong!1',
        name: 'Leonore',
      }),
    ).toEqual({ email: 'leonore@example.com', password: 'Strong!1', name: 'Leonore' });
  });

  it('rejects weak passwords', () => {
    expect(() =>
      registerSchema.parse({ email: 'leonore@example.com', password: 'password' }),
    ).toThrow();
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.parse({ email: 'leonore@example.com', password: 'password' })).toEqual({
      email: 'leonore@example.com',
      password: 'password',
    });
  });

  it('rejects an invalid email', () => {
    expect(() => loginSchema.parse({ email: 'not-an-email', password: 'password' })).toThrow();
  });
});
