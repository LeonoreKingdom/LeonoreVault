import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createRateLimiter, getClientIdentifier } from '../rateLimit.js';

function requestFor(ip: string): Request {
  return {
    headers: { 'cf-connecting-ip': ip },
    ip,
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

function responseMock() {
  const headers = new Map<string, string>();
  const response = {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name, value);
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response & { headers: Map<string, string> };
  return response;
}

describe('rate limiting middleware', () => {
  it('uses Cloudflare connecting IP as the client key', () => {
    expect(getClientIdentifier(requestFor('203.0.113.10'))).toBe('ip:203.0.113.10');
  });

  it('allows requests up to the limit and returns a standard 429 afterwards', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const request = requestFor('203.0.113.10');
    const response = responseMock();
    const next = vi.fn() as unknown as NextFunction;

    limiter(request, response, next);
    limiter(request, response, next);
    limiter(request, response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
    expect(response.headers.get('RateLimit-Limit')).toBe('2');
    expect(response.headers.get('RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toMatch(/^\d+$/);
  });

  it('keeps separate budgets for separate client IPs', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const response = responseMock();
    const next = vi.fn() as unknown as NextFunction;

    limiter(requestFor('203.0.113.10'), response, next);
    limiter(requestFor('203.0.113.11'), response, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('supports an explicit skip predicate', () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      skip: () => true,
    });
    const response = responseMock();
    const next = vi.fn() as unknown as NextFunction;

    limiter(requestFor('203.0.113.10'), response, next);
    limiter(requestFor('203.0.113.10'), response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.status).not.toHaveBeenCalled();
  });
});
