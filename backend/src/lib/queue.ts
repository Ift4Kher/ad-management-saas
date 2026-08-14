/**
 * BullMQ job queue infrastructure for the AdSync backend.
 *
 * Connects to Upstash Redis over TLS if configured.
 * In development or standalone mode without Redis, gracefully operates in fallback mode.
 */
import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from './redis.js';
import { logger } from './logger.js';

let testQueue: Queue | null = null;
let testWorker: Worker | null = null;
let publishQueue: Queue | null = null;
let rulesQueue: Queue | null = null;

const queueConnection = createRedisConnection();
const workerConnection = createRedisConnection();
const publishQueueConnection = createRedisConnection();
const rulesQueueConnection = createRedisConnection();

if (queueConnection && workerConnection && publishQueueConnection && rulesQueueConnection) {
  try {
    testQueue = new Queue('test-queue', {
      connection: queueConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    publishQueue = new Queue('publish-campaign', {
      connection: publishQueueConnection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 1,
      },
    });

    rulesQueue = new Queue('evaluate-rules', {
      connection: rulesQueueConnection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 1,
      },
    });

    testWorker = new Worker(
      'test-queue',
      async (job: Job) => {
        logger.info({ jobId: job.id, data: job.data }, 'Processing test job');
        await new Promise((resolve) => setTimeout(resolve, 100));
        logger.info({ jobId: job.id }, 'Test job completed');
        return { processed: true, timestamp: new Date().toISOString() };
      },
      {
        connection: workerConnection,
        stalledInterval: 300_000,
        lockDuration: 60_000,
      },
    );

    testWorker.on('completed', (job: Job) => {
      logger.debug({ jobId: job.id }, 'Test worker: job completed');
    });

    testWorker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error({ jobId: job?.id, err }, 'Test worker: job failed');
    });

    logger.info('BullMQ queues initialized (test-queue, publish-campaign, evaluate-rules)');
  } catch (err) {
    logger.warn({ err }, 'BullMQ initialization skipped — Redis unavailable');
  }
} else {
  logger.warn('BullMQ not initialized — running in direct execution fallback mode');
}

export { testQueue, publishQueue, rulesQueue };

/**
 * Enqueue a test job to verify the queue is functioning.
 */
export async function enqueueTestJob(data: Record<string, unknown> = {}): Promise<string | null> {
  if (!testQueue) return null;
  const job = await testQueue.add('test-job', {
    ...data,
    enqueuedAt: new Date().toISOString(),
  });
  return job.id ?? 'unknown';
}

/**
 * Enqueue a campaign publish job for a specific platform.
 */
export async function enqueuePublishJob(data: {
  campaignId: string;
  platform: string;
  attemptId: string;
  workspaceId: string;
}): Promise<string | null> {
  if (!publishQueue) {
    logger.warn({ ...data }, 'Publish job not enqueued — publishQueue not available');
    return null;
  }

  const job = await publishQueue.add(
    `publish-${data.platform}-${data.campaignId}`,
    {
      ...data,
      enqueuedAt: new Date().toISOString(),
    },
  );

  return job.id ?? 'unknown';
}

/**
 * Enqueue a rules evaluation job for a workspace.
 */
export async function enqueueRulesEvaluationJob(data: {
  workspaceId: string;
}): Promise<string | null> {
  if (!rulesQueue) {
    logger.warn({ ...data }, 'Rules evaluation job not enqueued — rulesQueue not available');
    return null;
  }

  const job = await rulesQueue.add(`eval-rules-${data.workspaceId}`, {
    ...data,
    enqueuedAt: new Date().toISOString(),
  });

  return job.id ?? 'unknown';
}

/**
 * Gracefully shut down all workers and queues.
 */
export async function closeQueues(): Promise<void> {
  if (testWorker) await testWorker.close();
  if (testQueue) await testQueue.close();
  if (publishQueue) await publishQueue.close();
  if (rulesQueue) await rulesQueue.close();
  logger.info('All BullMQ queues and workers closed');
}
