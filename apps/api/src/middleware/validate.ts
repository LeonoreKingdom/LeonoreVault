import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Express middleware factory that validates request data against a Zod schema.
 * Supports validating body, query, or params.
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
      // Replace raw data with parsed + transformed data
      if (source === 'body') {
        req.body = parsed;
      } else if (source === 'query') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).query = parsed;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).params = parsed;
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
