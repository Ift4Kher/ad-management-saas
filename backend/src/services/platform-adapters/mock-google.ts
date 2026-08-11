/**
 * Mock Google Ads Adapter
 *
 * Simulates the Google Ads API for campaign creation.
 * Produces realistic latency and returns a mock campaign resource name.
 * CLEARLY MARKED: Replace with real Google Ads API client in production.
 */

import { logger } from '../../lib/logger.js';
import type { PlatformAdapter, CampaignPayload, PublishResult } from './types.js';

export const mockGoogleAdapter: PlatformAdapter = {
  platform: 'GOOGLE',

  async publish(payload: CampaignPayload): Promise<PublishResult> {
    const startTime = Date.now();

    // Simulate realistic API latency (1–2s)
    const latency = 1000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const externalId = `gads_camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info(
      {
        adapter: 'mock-google',
        campaignId: payload.campaignId,
        externalId,
        durationMs: Date.now() - startTime,
      },
      'Mock Google Ads: campaign published successfully',
    );

    return {
      success: true,
      externalId,
    };
  },
};
