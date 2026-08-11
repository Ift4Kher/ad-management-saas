/**
 * Automation Rules Worker — BullMQ job processor
 *
 * Evaluates rules for a workspace against current campaign metrics.
 */

import { Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis.js';
import { evaluateRulesForWorkspace } from '../services/rules-service.js';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';

interface RulesJobData {
  workspaceId: string;
}

const REDIS_URL = process.env.UPSTASH_REDIS_URL;

let rulesWorker: Worker | null = null;

if (REDIS_URL) {
  const workerConnection = createRedisConnection();

  rulesWorker = new Worker<RulesJobData>(
    'evaluate-rules',
    async (job: Job<RulesJobData>) => {
      const { workspaceId } = job.data;
      const startTime = Date.now();

      logger.info(
        { jobId: job.id, workspaceId },
        'Rules worker: evaluating automation rules',
      );

      try {
        const result = await evaluateRulesForWorkspace(workspaceId);
        const durationMs = Date.now() - startTime;

        logger.info(
          { jobId: job.id, workspaceId, ...result, durationMs },
          'Rules worker: evaluation complete',
        );

        return result;
      } catch (err) {
        const durationMs = Date.now() - startTime;
        logger.error(
          { jobId: job.id, workspaceId, err, durationMs },
          'Rules worker: error evaluating rules',
        );

        Sentry.captureException(err, {
          tags: { workspaceId },
          extra: { jobId: job.id },
        });

        throw err;
      }
    },
    {
      connection: workerConnection,
      stalledInterval: 300_000,
      lockDuration: 60_000,
      concurrency: 2,
    },
  );

  rulesWorker.on('completed', (job: Job<RulesJobData>) => {
    logger.debug({ jobId: job.id, workspaceId: job.data.workspaceId }, 'Rules worker: job completed');
  });

  rulesWorker.on('failed', (job: Job<RulesJobData> | undefined, err: Error) => {
    logger.error({ jobId: job?.id, workspaceId: job?.data.workspaceId, err }, 'Rules worker: job failed');
  });

  logger.info('Rules evaluation worker initialized');
} else {
  logger.warn('Rules worker not initialized — UPSTASH_REDIS_URL not set');
}

export { rulesWorker };
