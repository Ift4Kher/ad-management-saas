/**
 * Mock Meta (Facebook/Instagram) Ads Adapter
 *
 * Simulates the Meta Marketing API for campaign creation.
 * CLEARLY MARKED: Replace with real Meta Marketing API client in production.
 */

import { logger } from '../../lib/logger.js';
import type { PlatformAdapter, CampaignPayload, PublishResult } from './types.js';

export const mockMetaAdapter: PlatformAdapter = {
  platform: 'META',

  async publish(payload: CampaignPayload): Promise<PublishResult> {
    const startTime = Date.now();

    // Simulate realistic API latency (1.5–3s — Meta is typically slower)
    const latency = 1500 + Math.random() * 1500;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const externalId = `meta_camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info(
      {
        adapter: 'mock-meta',
        campaignId: payload.campaignId,
        externalId,
        durationMs: Date.now() - startTime,
      },
      'Mock Meta Ads: campaign published successfully',
    );

    return {
      success: true,
      externalId,
    };
  },
};
