import { describe, it, expect } from 'vitest';
import {
  googleCallbackSchema,
  refreshTokenSchema,
  registerSchema,
  loginSchema,
} from '../auth.schema.js';

describe('googleCallbackSchema', () => {
  it('accepts valid code + redirectUri', () => {
    const result = googleCallbackSchema.parse({
      code: 'abc123',
      redirectUri: 'https://example.com/callback',
    });
    expect(result.code).toBe('abc123');
    expect(result.redirectUri).toBe('https://example.com/callback');
  });

  it('rejects empty code', () => {
    expect(() =>
      googleCallbackSchema.parse({ code: '', redirectUri: 'https://example.com' }),
    ).toThrow();
  });

  it('rejects invalid redirectUri', () => {
    expect(() => googleCallbackSchema.parse({ code: 'abc', redirectUri: 'not-a-url' })).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => googleCallbackSchema.parse({})).toThrow();
    expect(() => googleCallbackSchema.parse({ code: 'abc' })).toThrow();
  });
});

describe('refreshTokenSchema', () => {
  it('accepts a non-empty refreshToken', () => {
    expect(refreshTokenSchema.parse({ refreshToken: 'tok_123' })).toEqual({
      refreshToken: 'tok_123',
    });
  });

  it('rejects empty string', () => {
    expect(() => refreshTokenSchema.parse({ refreshToken: '' })).toThrow();
  });

  it('rejects missing field', () => {
    expect(() => refreshTokenSchema.parse({})).toThrow();
  });
});

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
