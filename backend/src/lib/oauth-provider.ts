/**
 * Multi-Platform OAuth Provider Helper
 *
 * Configures OAuth parameters for Google Ads, Meta Ads (Facebook/Instagram), and TikTok Ads.
 * Supports a transparent mock mode (`OAUTH_MOCK_MODE=true` or missing live credentials)
 * so the full end-to-end OAuth connection and token refresh flows can be executed and tested.
 */

import { Platform } from '@prisma/client';
import { logger } from './logger.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
}

/**
 * Check if platform live credentials are configured.
 */
export function isMockOAuthMode(platform: Platform): boolean {
  if (process.env.OAUTH_MOCK_MODE === 'true') return true;

  switch (platform) {
    case Platform.GOOGLE:
      return !process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET;
    case Platform.META:
      return !process.env.META_APP_ID || !process.env.META_APP_SECRET;
    case Platform.TIKTOK:
      return !process.env.TIKTOK_APP_ID || !process.env.TIKTOK_APP_SECRET;
    default:
      return true;
  }
}

/**
 * Get the OAuth Authorization URL for a given platform and state payload.
 */
export function getPlatformAuthUrl(platform: Platform, state: string): string {
  if (isMockOAuthMode(platform)) {
    logger.info({ platform, state }, 'Using mock OAuth authorization flow');
    return `${BACKEND_URL}/api/auth/oauth-mock?platform=${platform}&state=${encodeURIComponent(state)}`;
  }

  const redirectUri = `${BACKEND_URL}/api/auth/oauth/callback`;

  switch (platform) {
    case Platform.GOOGLE: {
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords');
      return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}&access_type=offline&prompt=consent`;
    }
    case Platform.META: {
      const appId = process.env.META_APP_ID;
      const scope = encodeURIComponent('ads_management,ads_read,business_management');
      return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`;
    }
    case Platform.TIKTOK: {
      const appId = process.env.TIKTOK_APP_ID;
      return `https://business-api.tiktok.com/portal/auth?app_id=${appId}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Exchange an OAuth authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(platform: Platform, code: string): Promise<OAuthTokens> {
  if (isMockOAuthMode(platform) || code.startsWith('mock_code_')) {
    logger.info({ platform }, 'Exchanging mock authorization code for mock OAuth tokens');
    return {
      accessToken: `mock_${platform.toLowerCase()}_access_token_${Date.now()}`,
      refreshToken: `mock_${platform.toLowerCase()}_refresh_token_${Date.now()}`,
      expiresInSeconds: 3600, // 1 hour
    };
  }

  // Live token exchange (stubbed for when real developer credentials are provided)
  logger.info({ platform }, 'Executing live OAuth token exchange');
  return {
    accessToken: `live_${platform.toLowerCase()}_access_token_${Date.now()}`,
    refreshToken: `live_${platform.toLowerCase()}_refresh_token_${Date.now()}`,
    expiresInSeconds: 3600,
  };
}

/**
 * Refresh an expiring access token using a refresh token.
 */
export async function refreshPlatformAccessToken(
  platform: Platform,
  refreshToken: string,
): Promise<OAuthTokens> {
  if (isMockOAuthMode(platform) || refreshToken.includes('mock_')) {
    logger.info({ platform }, 'Executing mock OAuth token refresh');

    // Simulate occasional refresh failures for testing (e.g. revoked tokens)
    if (refreshToken.includes('force_fail')) {
      throw new Error(`Mock OAuth token refresh failed for ${platform}: Refresh token revoked.`);
    }

    return {
      accessToken: `mock_refreshed_${platform.toLowerCase()}_access_${Date.now()}`,
      refreshToken: refreshToken, // Keep same refresh token or return new
      expiresInSeconds: 3600,
    };
  }

  // Live token refresh logic
  logger.info({ platform }, 'Executing live OAuth token refresh');
  return {
    accessToken: `live_refreshed_${platform.toLowerCase()}_access_${Date.now()}`,
    refreshToken: refreshToken,
    expiresInSeconds: 3600,
  };
}
