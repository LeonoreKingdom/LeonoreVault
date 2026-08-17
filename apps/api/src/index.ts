import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { logger } from './middleware/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRateLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { householdRouter } from './modules/household/household.routes.js';
import { categoryRouter } from './modules/category/category.routes.js';
import { locationRouter } from './modules/location/location.routes.js';
import { storageSpotRouter } from './modules/storage-spot/storage-spot.routes.js';
import { itemRouter } from './modules/item/item.routes.js';
import { attachmentRouter } from './modules/attachment/attachment.routes.js';
import { qrResolveRouter, qrRouter } from './modules/qr/qr.routes.js';
import { syncRouter } from './modules/sync/sync.routes.js';
import { notificationRouter } from './modules/notification/notification.routes.js';
import { runOverdueReminderJob } from './modules/notification/notification.service.js';

export function createApp(options: { startBackgroundJobs?: boolean } = {}): Express {
  const app: Express = express();

  // Global middleware.
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // Better Auth must run before the global body parser so it can read the raw
  // request stream. Legacy auth endpoints remain available during migration.
  app.use('/api/auth', authRateLimiter);
  app.use('/api/auth', authRouter);
  app.all('/api/auth/*splat', async (req, res, next) => {
    try {
      const { auth } = await import('./config/better-auth.js');
      return toNodeHandler(auth)(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Application routes.
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/households', householdRouter);
  app.use('/api/households/:householdId/categories', categoryRouter);
  app.use('/api/households/:householdId/locations', locationRouter);
  app.use('/api/households/:householdId/storage-spots', storageSpotRouter);
  app.use('/api/households/:householdId/items', itemRouter);
  app.use('/api/households/:householdId/items/:itemId/attachments', attachmentRouter);
  app.use('/api/households/:householdId/items', qrRouter);
  app.use('/api/households/:householdId/qr', qrResolveRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/notifications', notificationRouter);

  if (options.startBackgroundJobs && env.NODE_ENV !== 'test') {
    const runOverdueReminder = () => {
      void runOverdueReminderJob().catch((error: unknown) => {
        logger.error({ error }, 'Overdue reminder job failed');
      });
    };

    runOverdueReminder();
    const overdueReminderTimer = setInterval(runOverdueReminder, env.OVERDUE_REMINDER_INTERVAL_MS);
    overdueReminderTimer.unref();
  }

  // Error handling must be last.
  app.use(errorHandler);

  return app;
}

// Next.js owns the production server/bootstrap. This Express application is
// imported only by the compatibility adapter for routes not yet native to
// Next.js, so importing it never opens a listening socket.
export default createApp({ startBackgroundJobs: false });
