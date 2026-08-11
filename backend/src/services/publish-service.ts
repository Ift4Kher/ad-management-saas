/**
 * Campaign Publishing Service
 *
 * Orchestrates publishing a campaign to one or more ad platforms.
 * Creates PublishAttempt records, enqueues BullMQ jobs, and handles retries.
 *
 * KEY DESIGN:
 * - Each platform gets its own BullMQ job so slow/failing platforms don't block others.
 * - Partial failures are first-class: the campaign tracks per-platform status.
 * - Retry is scoped to a single failed platform — already-succeeded platforms are NOT re-published.
 */

import type { Platform } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { enqueuePublishJob } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

/**
 * Publish a campaign to the specified platform.
 * Creates a PublishAttempt, sets campaign status to PUBLISHING, and enqueues a BullMQ job.
 */
export async function publishCampaign(
  campaignId: string,
  platform: Platform,
): Promise<{ attemptId: string; jobId: string | null }> {
  // Validate campaign exists and is in a publishable state
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PUBLISHING') {
    throw new Error(`Campaign cannot be published from status "${campaign.status}". Must be DRAFT or PUBLISHING.`);
  }

  // Check if there's already a pending/publishing attempt for this platform
  const existingAttempt = await prisma.publishAttempt.findFirst({
    where: {
      campaignId,
      platform,
      status: { in: ['PENDING', 'PUBLISHING'] },
    },
  });

  if (existingAttempt) {
    throw new Error(`A publish attempt for ${platform} is already in progress.`);
  }

  // Get the highest attempt number for this campaign+platform combo
  const lastAttempt = await prisma.publishAttempt.findFirst({
    where: { campaignId, platform },
    orderBy: { attemptNumber: 'desc' },
  });

  const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

  // Create the publish attempt record
  const attempt = await prisma.publishAttempt.create({
    data: {
      campaignId,
      platform,
      status: 'PENDING',
      attemptNumber,
    },
  });

  // Set campaign status to PUBLISHING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PUBLISHING' },
  });

  // Enqueue the BullMQ job
  const jobId = await enqueuePublishJob({
    campaignId,
    platform,
    attemptId: attempt.id,
    workspaceId: campaign.workspaceId,
  });

  // Update the attempt with the job ID
  if (jobId) {
    await prisma.publishAttempt.update({
      where: { id: attempt.id },
      data: { jobId },
    });
  }

  logger.info(
    { campaignId, platform, attemptId: attempt.id, attemptNumber, jobId },
    'Campaign publish job enqueued',
  );

  return { attemptId: attempt.id, jobId };
}

/**
 * Retry publishing for a specific failed platform.
 * Only re-attempts the specified platform — other platforms are untouched.
 */
export async function retryPublish(
  campaignId: string,
  platform: Platform,
): Promise<{ attemptId: string; jobId: string | null }> {
  // Verify the last attempt for this platform actually failed
  const lastAttempt = await prisma.publishAttempt.findFirst({
    where: { campaignId, platform },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastAttempt) {
    throw new Error(`No publish attempt found for ${platform}.`);
  }

  if (lastAttempt.status !== 'FAILED') {
    throw new Error(`Cannot retry: last ${platform} attempt status is "${lastAttempt.status}", not FAILED.`);
  }

  logger.info(
    { campaignId, platform, previousAttemptId: lastAttempt.id },
    'Retrying failed publish attempt',
  );

  // Delegate to publishCampaign which handles attempt creation and job enqueue
  return publishCampaign(campaignId, platform);
}

/**
 * Recalculate campaign status based on all publish attempts.
 * Called after each publish job completes to determine overall campaign state.
 */
export async function recalculateCampaignStatus(campaignId: string): Promise<void> {
  // Get the latest attempt for each platform
  const allAttempts = await prisma.publishAttempt.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });

  // Group by platform, take the latest attempt per platform
  const latestByPlatform = new Map<Platform, typeof allAttempts[0]>();
  for (const attempt of allAttempts) {
    if (!latestByPlatform.has(attempt.platform)) {
      latestByPlatform.set(attempt.platform, attempt);
    }
  }

  const latestAttempts = Array.from(latestByPlatform.values());

  if (latestAttempts.length === 0) return;

  const allSucceeded = latestAttempts.every((a) => a.status === 'SUCCESS');
  const allFailed = latestAttempts.every((a) => a.status === 'FAILED');
  const anyPending = latestAttempts.some((a) => a.status === 'PENDING' || a.status === 'PUBLISHING');

  let newStatus: 'DRAFT' | 'PUBLISHING' | 'ACTIVE';

  if (allSucceeded) {
    newStatus = 'ACTIVE';
  } else if (allFailed) {
    newStatus = 'DRAFT';
  } else if (anyPending) {
    newStatus = 'PUBLISHING';
  } else {
    // Mix of SUCCESS and FAILED — stays PUBLISHING (partial failure)
    newStatus = 'PUBLISHING';
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: newStatus },
  });

  logger.info(
    { campaignId, newStatus, attemptStatuses: latestAttempts.map((a) => ({ platform: a.platform, status: a.status })) },
    'Campaign status recalculated',
  );
}
