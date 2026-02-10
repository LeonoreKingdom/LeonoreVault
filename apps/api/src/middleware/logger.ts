import pino from 'pino';

/**
 * Application logger using pino.
 * In development, uses pino-pretty for human-readable output.
 * In production, outputs structured JSON for log aggregation.
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
