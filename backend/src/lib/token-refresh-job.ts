/**
 * Proactive OAuth Token Refresh Worker (BullMQ + Sentry)
 *
 * Checks database for expiring ad account connections (where token_expires_at is within 30 minutes),
 * decrypts refresh tokens using Phase 2 AES-256-GCM utility, fetches fresh access tokens,
 * re-encrypts new tokens at rest, and logs any failures to Sentry and Pino logger.
 */

import { Queue, Worker, type Job } from 'bullmq';
import { prisma } from './db.js';
import { decryptToken, encryptToken } from './encryption.js';
import { refreshPlatformAccessToken } from './oauth-provider.js';
import { createRedisConnection } from './redis.js';
import { logger } from './logger.js';
import { Sentry } from './sentry.js';
import { ConnectionStatus } from '@prisma/client';

const QUEUE_NAME = 'token-refresh-queue';
let tokenRefreshQueue: Queue | null = null;
let tokenRefreshWorker: Worker | null = null;

const queueConnection = createRedisConnection();
const workerConnection = createRedisConnection();

if (queueConnection && workerConnection) {
  tokenRefreshQueue = new Queue(QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      removeOnComplete: 20,
      removeOnFail: 100,
    },
  });

  tokenRefreshWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info({ jobId: job.id }, '🔄 Running scheduled OAuth token refresh job');
      return await executeTokenRefreshBatch();
    },
    {
      connection: workerConnection,
      stalledInterval: 300_000,
    },
  );

  tokenRefreshWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Token refresh worker job failed');
    Sentry.captureException(err);
  });

  // Schedule repeatable job every 15 minutes
  tokenRefreshQueue
    .add('scheduled-refresh', {}, { repeat: { pattern: '*/15 * * * *' } })
    .then(() => logger.info('Scheduled 15-minute token refresh job registered in BullMQ'))
    .catch((err) => logger.error({ err }, 'Failed to schedule token refresh job'));
} else {
  logger.warn('Token refresh queue not initialized — UPSTASH_REDIS_URL missing');
}

/**
 * Execute a token refresh batch across all expiring connections.
 */
export async function executeTokenRefreshBatch() {
  const expiryThreshold = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  const expiringConnections = await prisma.adAccountConnection.findMany({
    where: {
      status: ConnectionStatus.CONNECTED,
      tokenExpiresAt: {
        lte: expiryThreshold,
      },
    },
  });

  logger.info({ count: expiringConnections.length }, `Found ${expiringConnections.length} connections needing token refresh`);

  let refreshedCount = 0;
  let failedCount = 0;

  for (const conn of expiringConnections) {
    try {
      if (!conn.refreshTokenEncrypted) {
        logger.warn({ connectionId: conn.id, platform: conn.platform }, 'Cannot refresh token: missing refresh token');
        await prisma.adAccountConnection.update({
          where: { id: conn.id },
          data: { status: ConnectionStatus.EXPIRED },
        });
        continue;
      }

      // Decrypt refresh token
      const rawRefreshToken = decryptToken(conn.refreshTokenEncrypted);

      // Fetch fresh tokens from platform (or mock provider)
      const freshTokens = await refreshPlatformAccessToken(conn.platform, rawRefreshToken);

      // Re-encrypt new access and refresh tokens
      const newAccessTokenEncrypted = encryptToken(freshTokens.accessToken);
      const newRefreshTokenEncrypted = freshTokens.refreshToken
        ? encryptToken(freshTokens.refreshToken)
        : conn.refreshTokenEncrypted;

      const newExpiry = new Date(Date.now() + freshTokens.expiresInSeconds * 1000);

      // Save encrypted tokens back to DB
      await prisma.adAccountConnection.update({
        where: { id: conn.id },
        data: {
          accessTokenEncrypted: newAccessTokenEncrypted,
          refreshTokenEncrypted: newRefreshTokenEncrypted,
          tokenExpiresAt: newExpiry,
          status: ConnectionStatus.CONNECTED,
        },
      });

      refreshedCount++;
      logger.info({ connectionId: conn.id, platform: conn.platform }, 'OAuth token refreshed and re-encrypted successfully');
    } catch (err) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ connectionId: conn.id, platform: conn.platform, err }, `Token refresh failed for ${conn.platform}: ${errorMessage}`);

      // Mark connection status as EXPIRED or ERROR
      await prisma.adAccountConnection.update({
        where: { id: conn.id },
        data: { status: ConnectionStatus.EXPIRED },
      });

      // Log failure to Sentry
      Sentry.captureException(err, {
        extra: {
          connectionId: conn.id,
          platform: conn.platform,
          workspaceId: conn.workspaceId,
        },
      });
    }
  }

  return { processed: expiringConnections.length, refreshed: refreshedCount, failed: failedCount };
}

export { tokenRefreshQueue, tokenRefreshWorker };
