/**
 * Redis connection for the AdSync backend — connects to Upstash Redis over TLS.
 *
 * Uses ioredis (NOT the Upstash REST SDK) because BullMQ requires a
 * persistent Redis protocol connection. The `rediss://` URL from Upstash
 * provides TLS-encrypted connectivity.
 *
 * Key config:
 * - tls: {} — required for Upstash's TLS endpoint
 * - maxRetriesPerRequest: null — required by BullMQ
 * - enableReadyCheck: false — smoother cloud Redis startup
 */
import { Redis } from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env.UPSTASH_REDIS_URL || '';

if (!REDIS_URL) {
  logger.warn('UPSTASH_REDIS_URL not set — Redis features will be unavailable');
}

/**
 * Create a new Redis connection to Upstash.
 * Each BullMQ Queue/Worker needs its own connection instance,
 * so we export a factory function alongside the shared instance.
 */
export function createRedisConnection(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false, // Smoother for cloud Redis
    retryStrategy(times: number) {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries — giving up');
        return null;
      }
      return Math.min(times * 200, 3000);
    },
  });
}

// Shared connection instance for general Redis operations (health checks, caching)
export const redis = REDIS_URL ? createRedisConnection() : null;

if (redis) {
  redis.on('connect', () => {
    logger.info('Redis connected (Upstash)');
  });

  redis.on('error', (err: Error) => {
    logger.error({ err }, 'Redis connection error');
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });
}

/**
 * Check Redis connectivity by sending a PING command.
 * Returns true if Redis responds with "PONG", false otherwise.
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
