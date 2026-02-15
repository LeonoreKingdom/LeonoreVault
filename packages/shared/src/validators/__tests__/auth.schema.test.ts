import { describe, it, expect } from 'vitest';
import { googleCallbackSchema, refreshTokenSchema } from '../auth.schema.js';

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
    expect(() =>
      googleCallbackSchema.parse({ code: 'abc', redirectUri: 'not-a-url' }),
    ).toThrow();
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
