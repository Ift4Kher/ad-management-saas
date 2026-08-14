/**
 * Redis connection for the AdSync backend — connects to Upstash Redis over TLS.
 *
 * Uses ioredis (NOT the Upstash REST SDK) because BullMQ requires a
 * persistent Redis protocol connection. The `rediss://` URL from Upstash
 * provides TLS-encrypted connectivity.
 */
import { Redis } from 'ioredis';
import { logger } from './logger.js';

const rawRedisUrl = process.env.UPSTASH_REDIS_URL || '';
const isRedisConfigured =
  Boolean(rawRedisUrl) &&
  !rawRedisUrl.includes('your-endpoint.upstash.io') &&
  !rawRedisUrl.includes('your-password') &&
  rawRedisUrl.startsWith('redis');

if (!isRedisConfigured) {
  logger.warn('UPSTASH_REDIS_URL is not configured or using placeholder — running in in-memory fallback mode');
}

/**
 * Create a new Redis connection to Upstash.
 */
export function createRedisConnection(): Redis | null {
  if (!isRedisConfigured) return null;

  try {
    const client = new Redis(rawRedisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 3) {
          return null; // Don't hang the server with endless retries
        }
        return Math.min(times * 200, 1000);
      },
    });

    client.on('error', (err: Error) => {
      logger.warn({ err: err.message }, 'Redis fallback: connection failed, continuing in offline mode');
    });

    return client;
  } catch (err) {
    logger.warn({ err }, 'Could not create Redis connection');
    return null;
  }
}

// Shared connection instance for general Redis operations
export const redis = isRedisConfigured ? createRedisConnection() : null;

if (redis) {
  redis.connect().catch(() => {
    logger.warn('Redis connection failed on initial connect — running in fallback mode');
  });
}

/**
 * Check Redis connectivity by sending a PING command.
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!redis || !isRedisConfigured) return false;
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
