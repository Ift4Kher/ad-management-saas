/**
 * Health-check route for the AdSync backend.
 *
 * GET /api/health
 *
 * Verifies server is running and checks Upstash Redis connectivity.
 * Returns structured JSON with service statuses and a timestamp.
 */
import { Router, type Request, type Response } from 'express';
import { checkRedisHealth } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const redisHealthy = await checkRedisHealth();

    const response = {
      status: redisHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
      version: '0.1.0',
    };

    if (!redisHealthy) {
      logger.warn('Health check: Redis is disconnected');
    }

    // Always return HTTP 200 JSON so web servers (Apache/LiteSpeed/cPanel) don't intercept it
    res.status(200).json(response);
  } catch (err) {
    logger.error({ err }, 'Health check failed');
    res.status(200).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: { redis: 'unknown' },
      version: '0.1.0',
    });
  }
});
