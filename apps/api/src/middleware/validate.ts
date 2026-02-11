import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

// Extend Express Request to hold validated data
declare global {
  namespace Express {
    interface Request {
      validated?: Record<string, unknown>;
    }
  }
}

/**
 * Express middleware factory that validates request data against a Zod schema.
 * Supports validating body, query, or params.
 *
 * - For 'body': replaces req.body with parsed data (writable in Express 5).
 * - For 'query'/'params': stores parsed data on req.validated (read-only in Express 5).
 *
 * @example
 * ```ts
 * router.post('/', validate(createItemSchema, 'body'), controller.create);
 * router.get('/', validate(itemListQuerySchema, 'query'), controller.list);
 * ```
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') {
        req.body = parsed;
      } else {
        // Express 5: req.query and req.params are read-only getters
        // Store parsed + transformed data on req.validated
        req.validated = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || '_root';
          if (!details[key]) details[key] = [];
          details[key].push(issue.message);
        }
        next(new AppError(400, 'Validation failed', 'VALIDATION_ERROR', details));
        return;
      }
      next(err);
    }
  };
}
