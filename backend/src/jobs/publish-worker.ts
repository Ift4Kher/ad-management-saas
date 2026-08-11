/**
 * Campaign Publish Worker — BullMQ job processor
 *
 * Processes individual platform publish jobs from the 'publish-campaign' queue.
 * Each job targets one platform, calls the adapter, updates the PublishAttempt
 * record, recalculates campaign status, and logs/reports failures.
 *
 * LOGGING POLICY: Logs campaign IDs, platforms, durations, and error messages.
 * Never logs tokens or credentials.
 */

import { Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis.js';
import { prisma } from '../lib/db.js';
import { getAdapter } from '../services/platform-adapters/index.js';
import { recalculateCampaignStatus } from '../services/publish-service.js';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import type { Platform } from '@prisma/client';

interface PublishJobData {
  campaignId: string;
  platform: Platform;
  attemptId: string;
  workspaceId: string;
}

const REDIS_URL = process.env.UPSTASH_REDIS_URL;

let publishWorker: Worker | null = null;

if (REDIS_URL) {
  const workerConnection = createRedisConnection();

  publishWorker = new Worker<PublishJobData>(
    'publish-campaign',
    async (job: Job<PublishJobData>) => {
      const { campaignId, platform, attemptId, workspaceId } = job.data;
      const startTime = Date.now();

      logger.info(
        { jobId: job.id, campaignId, platform, attemptId },
        'Publish worker: processing job',
      );

      try {
        // Mark the attempt as PUBLISHING
        await prisma.publishAttempt.update({
          where: { id: attemptId },
          data: { status: 'PUBLISHING' },
        });

        // Fetch campaign data for the adapter
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
        });

        if (!campaign) {
          throw new Error(`Campaign ${campaignId} not found`);
        }

        // Get the platform adapter and call publish
        const adapter = getAdapter(platform);
        const result = await adapter.publish({
          campaignId: campaign.id,
          workspaceId,
          name: campaign.name,
          platform,
          objective: campaign.objective,
          budget: Number(campaign.budget),
          metadata: campaign.metadata as Record<string, unknown> | null,
        });

        const durationMs = Date.now() - startTime;

        if (result.success) {
          // SUCCESS — update attempt with external ID
          await prisma.publishAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'SUCCESS',
              externalId: result.externalId || null,
            },
          });

          logger.info(
            { jobId: job.id, campaignId, platform, attemptId, externalId: result.externalId, durationMs },
            'Publish worker: platform publish succeeded',
          );
        } else {
          // FAILED — update attempt with error details
          await prisma.publishAttempt.update({
            where: { id: attemptId },
            data: {
              status: 'FAILED',
              errorMessage: result.errorMessage || 'Unknown error',
              errorCode: result.errorCode || null,
            },
          });

          logger.error(
            { jobId: job.id, campaignId, platform, attemptId, errorMessage: result.errorMessage, errorCode: result.errorCode, durationMs },
            'Publish worker: platform publish failed',
          );

          // Report to Sentry
          Sentry.captureException(new Error(`Campaign publish failed on ${platform}: ${result.errorMessage}`), {
            tags: { platform, campaignId },
            extra: { errorCode: result.errorCode, attemptId, durationMs },
          });
        }
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unexpected worker error';

        // Unexpected exception — mark as FAILED
        await prisma.publishAttempt.update({
          where: { id: attemptId },
          data: {
            status: 'FAILED',
            errorMessage,
            errorCode: 'WORKER_EXCEPTION',
          },
        });

        logger.error(
          { jobId: job.id, campaignId, platform, attemptId, err, durationMs },
          'Publish worker: unexpected exception',
        );

        Sentry.captureException(err, {
          tags: { platform, campaignId },
          extra: { attemptId, durationMs },
        });
      }

      // Always recalculate campaign status after each job completes
      await recalculateCampaignStatus(campaignId);

      return { campaignId, platform, attemptId };
    },
    {
      connection: workerConnection,
      stalledInterval: 300_000,
      lockDuration: 60_000,
      concurrency: 3,
    },
  );

  publishWorker.on('completed', (job: Job<PublishJobData>) => {
    logger.debug(
      { jobId: job.id, campaignId: job.data.campaignId, platform: job.data.platform },
      'Publish worker: job completed',
    );
  });

  publishWorker.on('failed', (job: Job<PublishJobData> | undefined, err: Error) => {
    logger.error(
      { jobId: job?.id, campaignId: job?.data.campaignId, platform: job?.data.platform, err },
      'Publish worker: job failed (BullMQ level)',
    );
  });

  logger.info('Publish campaign worker initialized');
} else {
  logger.warn('Publish worker not initialized — UPSTASH_REDIS_URL not set');
}

export { publishWorker };
