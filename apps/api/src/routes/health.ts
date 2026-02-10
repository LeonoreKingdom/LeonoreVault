import { Router, type IRouter } from 'express';

export const healthRouter: IRouter = Router();

/**
 * GET /health
 * Basic health check endpoint for uptime monitoring and deployment validation.
 * Returns the service status, current timestamp, and uptime.
 */
healthRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'leonorevault-api',
      version: process.env['npm_package_version'] || '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    },
  });
});
