import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';

const app: Express = express();
const PORT = parseInt(process.env['PORT'] || '4000', 10);

// ─── Global Middleware ──────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────
app.use('/health', healthRouter);

// Placeholder: Module routes will be registered here in later tasks
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/households', householdRouter);
// app.use('/api/v1/items', itemRouter);

// ─── Error Handling (must be last) ──────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 LeonoreVault API running on http://localhost:${PORT}`);
  logger.info(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
