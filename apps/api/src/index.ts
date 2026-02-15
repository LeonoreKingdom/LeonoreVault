import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './middleware/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { householdRouter } from './modules/household/household.routes.js';
import { categoryRouter } from './modules/category/category.routes.js';
import { locationRouter } from './modules/location/location.routes.js';
import { itemRouter } from './modules/item/item.routes.js';
import { attachmentRouter } from './modules/attachment/attachment.routes.js';
import { qrRouter } from './modules/qr/qr.routes.js';

const app: Express = express();

// ─── Global Middleware ──────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Routes ─────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/households', householdRouter);
app.use('/api/households/:householdId/categories', categoryRouter);
app.use('/api/households/:householdId/locations', locationRouter);
app.use('/api/households/:householdId/items', itemRouter);
app.use('/api/households/:householdId/items/:itemId/attachments', attachmentRouter);
app.use('/api/households/:householdId/items', qrRouter);

// ─── Error Handling (must be last) ──────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`🚀 LeonoreVault API running on http://localhost:${env.PORT}`);
  logger.info(`📋 Health check: http://localhost:${env.PORT}/health`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

export default app;
