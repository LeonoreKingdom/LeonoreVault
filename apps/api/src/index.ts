import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './middleware/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';

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

// Placeholder: Module routes will be registered here in later tasks
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/households', householdRouter);
// app.use('/api/v1/items', itemRouter);

// ─── Error Handling (must be last) ──────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`🚀 LeonoreVault API running on http://localhost:${env.PORT}`);
  logger.info(`📋 Health check: http://localhost:${env.PORT}/health`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

export default app;
