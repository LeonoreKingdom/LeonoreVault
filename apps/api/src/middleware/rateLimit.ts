import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface RateLimitOptions {
  /** Length of the fixed window in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed for one client key in the window. */
  max: number;
  /** Optional client key override for authenticated or route-scoped limits. */
  keyGenerator?: (req: Request) => string;
  /** Optional bypass for local tests or trusted internal traffic. */
  skip?: (req: Request) => boolean;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Prefer the address supplied by Cloudflare, then the first proxy address, and
 * finally Express' socket-derived address. The edge WAF remains the primary
 * protection; this middleware is a best-effort per-instance backstop.
 */
export function getClientIdentifier(req: Request): string {
  const cloudflareAddress = req.headers['cf-connecting-ip'];
  if (typeof cloudflareAddress === 'string' && cloudflareAddress.trim()) {
    return `ip:${cloudflareAddress.trim()}`;
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const firstForwardedAddress = forwardedFor.split(',')[0]?.trim();
    if (firstForwardedAddress) return `ip:${firstForwardedAddress}`;
  }

  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function assertValidOptions({ windowMs, max }: RateLimitOptions): void {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('Rate limit windowMs must be a positive number');
  }
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('Rate limit max must be a positive number');
  }
}

/**
 * Create a small fixed-window limiter that works without an external store.
 * State is intentionally process-local because Vercel/Cloudflare provide the
 * durable edge protection; this prevents unbounded growth on one instance.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  assertValidOptions(options);
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.skip?.(req)) {
      next();
      return;
    }

    const now = Date.now();
    const key = options.keyGenerator?.(req) ?? getClientIdentifier(req);
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + options.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    // Clean up expired keys only when the map grows, avoiding a background
    // timer that would keep a serverless function instance alive.
    if (buckets.size > 1024) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    const remaining = Math.max(0, options.max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
      return;
    }

    next();
  };
}

const skipDuringTests = (req: Request): boolean => req.app?.get('env') === 'test';

/** Authentication endpoints are intentionally stricter than ordinary reads. */
export const authRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  skip: skipDuringTests,
});

/** Shared budget for expensive write endpoints such as upload, sync, and QR PDF. */
export const expensiveMutationRateLimiter: RequestHandler = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  skip: skipDuringTests,
});
