/**
 * Platform Adapter Registry
 *
 * Factory that returns the correct adapter for a given platform.
 * Currently returns mock adapters; swapping to real API clients
 * is a one-line change per platform in this file.
 *
 * SWAP POINT: To use real APIs, replace the mock imports with
 * real SDK clients that implement the same PlatformAdapter interface.
 */

import type { Platform } from '@prisma/client';
import type { PlatformAdapter } from './types.js';
import { mockGoogleAdapter } from './mock-google.js';
import { mockMetaAdapter } from './mock-meta.js';
import { mockTikTokAdapter } from './mock-tiktok.js';

const adapters: Record<Platform, PlatformAdapter> = {
  GOOGLE: mockGoogleAdapter,   // SWAP: import { googleAdapter } from './google.js';
  META: mockMetaAdapter,       // SWAP: import { metaAdapter } from './meta.js';
  TIKTOK: mockTikTokAdapter,   // SWAP: import { tiktokAdapter } from './tiktok.js';
};

/**
 * Get the platform adapter for a given platform.
 * Throws if no adapter is registered for the platform.
 */
export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`No adapter registered for platform: ${platform}`);
  }
  return adapter;
}

export type { PlatformAdapter, CampaignPayload, PublishResult } from './types.js';
