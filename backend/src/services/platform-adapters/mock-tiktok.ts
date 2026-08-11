/**
 * Mock TikTok Ads Adapter
 *
 * Simulates the TikTok Marketing API for campaign creation.
 * CONFIGURABLE FAILURE: Set env var MOCK_TIKTOK_FAIL=true to force failure.
 * This allows testing partial-failure handling without changing code.
 *
 * CLEARLY MARKED: Replace with real TikTok Marketing API client in production.
 */

import { logger } from '../../lib/logger.js';
import type { PlatformAdapter, CampaignPayload, PublishResult } from './types.js';

export const mockTikTokAdapter: PlatformAdapter = {
  platform: 'TIKTOK',

  async publish(payload: CampaignPayload): Promise<PublishResult> {
    const startTime = Date.now();
    const shouldFail = process.env.MOCK_TIKTOK_FAIL === 'true';

    // Simulate realistic API latency (1–2.5s)
    const latency = 1000 + Math.random() * 1500;
    await new Promise((resolve) => setTimeout(resolve, latency));

    if (shouldFail) {
      logger.warn(
        {
          adapter: 'mock-tiktok',
          campaignId: payload.campaignId,
          durationMs: Date.now() - startTime,
        },
        'Mock TikTok Ads: campaign publish FAILED (MOCK_TIKTOK_FAIL=true)',
      );

      return {
        success: false,
        errorMessage: 'TikTok API rate limit exceeded. Please retry after 60 seconds.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      };
    }

    const externalId = `tt_camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info(
      {
        adapter: 'mock-tiktok',
        campaignId: payload.campaignId,
        externalId,
        durationMs: Date.now() - startTime,
      },
      'Mock TikTok Ads: campaign published successfully',
    );

    return {
      success: true,
      externalId,
    };
  },
};
