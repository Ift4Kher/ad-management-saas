/**
 * Platform Adapter Interface
 *
 * Defines the contract every platform adapter must implement.
 * Mock adapters simulate realistic behavior; real adapters will
 * swap in with the same interface — a contained change in the registry.
 */

import type { Platform } from '@prisma/client';

/** Payload sent to a platform adapter for publishing */
export interface CampaignPayload {
  campaignId: string;
  workspaceId: string;
  name: string;
  platform: Platform;
  objective: string;
  budget: number;
  metadata: Record<string, unknown> | null;
}

/** Result returned by a platform adapter after a publish attempt */
export interface PublishResult {
  success: boolean;
  /** Platform's external campaign ID (e.g. Google's campaign resource name) */
  externalId?: string;
  /** Human-readable error message (safe for UI display) */
  errorMessage?: string;
  /** Machine-readable error code for programmatic handling */
  errorCode?: string;
}

/** Interface every platform adapter must implement */
export interface PlatformAdapter {
  platform: Platform;
  /**
   * Publish a campaign to the external platform.
   * Must NOT throw — all errors should be returned as PublishResult with success: false.
   */
  publish(payload: CampaignPayload): Promise<PublishResult>;
}
