import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

/**
 * Custom application error with an HTTP status code.
 * Throw this from services/controllers for clean error responses.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler middleware.
 * Catches all thrown errors and returns a standardized JSON response
 * matching the ApiError type from @leonorevault/shared.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Log unexpected errors
  logger.error({ err }, 'Unhandled error');

  // Return generic 500 for unknown errors (don't leak internals)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env['NODE_ENV'] === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
}
