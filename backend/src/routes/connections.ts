/**
 * Ad Account Connections API Routes
 *
 * Handles connecting ad platform accounts (Google Ads, Meta Ads, TikTok Ads),
 * OAuth state & callback handling, token encryption at rest, and account disconnection.
 *
 * HARD SECURITY REQUIREMENTS:
 * 1. Encrypted OAuth tokens MUST NEVER be returned in any API response body.
 * 2. Connecting accounts requires an EDITOR or OWNER role and a verified email address.
 * 3. Tokens are encrypted using Phase 2 AES-256-GCM before writing to PostgreSQL.
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth, requireWorkspaceAccess, requireEmailVerified } from '../middleware/auth.js';
import { encryptToken } from '../lib/encryption.js';
import { getPlatformAuthUrl, exchangeCodeForTokens } from '../lib/oauth-provider.js';
import { Platform, ConnectionStatus, WorkspaceRole } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { generateActionToken, verifyActionToken } from '../lib/jwt.js';

export const connectionsRouter = Router();

/**
 * GET /api/workspaces/:workspaceId/connections
 * List connected ad accounts for a workspace.
 *
 * SECURITY GUARANTEE:
 * Returns connection metadata (id, platform, status, connectedAt, tokenExpiresAt).
 * EXCLUDES `accessTokenEncrypted` and `refreshTokenEncrypted` completely!
 */
connectionsRouter.get(
  '/workspaces/:workspaceId/connections',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scopedDb = req.scopedDb!;

      const rawConnections = await scopedDb.adAccountConnection.findMany({
        orderBy: { connectedAt: 'desc' },
      });

      // Explicitly map properties to ensure encrypted tokens are NEVER sent to the client
      const connections = rawConnections.map((c) => ({
        id: c.id,
        workspaceId: c.workspaceId,
        platform: c.platform,
        status: c.status,
        connectedAt: c.connectedAt,
        tokenExpiresAt: c.tokenExpiresAt,
      }));

      res.json({ connections });
    } catch (err) {
      logger.error({ err }, 'Error fetching connections');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/connections/:platform/connect
 * Initiate OAuth authorization flow for Google, Meta, or TikTok.
 * Requires: EDITOR or OWNER role, verified email address.
 */
connectionsRouter.get(
  '/workspaces/:workspaceId/connections/:platform/connect',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const platform = req.params.platform as string;
      const uppercasePlatform = platform.toUpperCase() as Platform;

      if (!Object.values(Platform).includes(uppercasePlatform)) {
        res.status(400).json({ error: `Invalid platform '${platform}'. Must be GOOGLE, META, or TIKTOK.` });
        return;
      }

      // Generate state token containing workspaceId and platform
      const stateToken = generateActionToken({
        userId: `${req.workspaceId}:${uppercasePlatform}`,
        type: 'VERIFY_EMAIL', // reusing generic action token payload structure
      });

      const statePayload = Buffer.from(
        JSON.stringify({
          workspaceId: req.workspaceId,
          platform: uppercasePlatform,
          userId: req.user!.id,
          token: stateToken,
        }),
      ).toString('base64');

      const authUrl = getPlatformAuthUrl(uppercasePlatform, statePayload);

      res.json({ authUrl });
    } catch (err) {
      logger.error({ err }, 'Error initiating OAuth connection');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * GET /api/auth/oauth/callback
 * Handle OAuth callback from provider (or mock provider).
 * Exchanges code for tokens, encrypts tokens with AES-256-GCM, and updates DB.
 */
connectionsRouter.get('/auth/oauth/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error: oauthError } = req.query;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (oauthError) {
      logger.warn({ oauthError }, 'OAuth provider returned an error');
      res.redirect(`${FRONTEND_URL}/dashboard/connections?status=error&message=${encodeURIComponent(String(oauthError))}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${FRONTEND_URL}/dashboard/connections?status=error&message=Missing+code+or+state`);
      return;
    }

    // Decode state payload
    const decodedState = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
    const { workspaceId, platform } = decodedState;

    if (!workspaceId || !platform) {
      res.redirect(`${FRONTEND_URL}/dashboard/connections?status=error&message=Invalid+state+payload`);
      return;
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(platform as Platform, String(code));

    // ENCRYPT TOKENS AT REST
    const accessTokenEncrypted = encryptToken(tokens.accessToken);
    const refreshTokenEncrypted = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

    const tokenExpiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);

    // Find existing connection for this workspace & platform, or create new
    const existing = await prisma.adAccountConnection.findFirst({
      where: { workspaceId, platform: platform as Platform },
    });

    if (existing) {
      await prisma.adAccountConnection.update({
        where: { id: existing.id },
        data: {
          accessTokenEncrypted,
          refreshTokenEncrypted,
          status: ConnectionStatus.CONNECTED,
          connectedAt: new Date(),
          tokenExpiresAt,
        },
      });
    } else {
      await prisma.adAccountConnection.create({
        data: {
          workspaceId,
          platform: platform as Platform,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          status: ConnectionStatus.CONNECTED,
          connectedAt: new Date(),
          tokenExpiresAt,
        },
      });
    }

    logger.info({ workspaceId, platform }, 'Ad account connected successfully with encrypted tokens');

    res.redirect(`${FRONTEND_URL}/dashboard/connections?status=success&platform=${platform}`);
  } catch (err) {
    logger.error({ err }, 'Error handling OAuth callback');
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${FRONTEND_URL}/dashboard/connections?status=error&message=OAuth+exchange+failed`);
  }
});

/**
 * DELETE /api/workspaces/:workspaceId/connections/:connectionId
 * Disconnect an ad account.
 * Requires: EDITOR or OWNER role.
 */
connectionsRouter.delete(
  '/workspaces/:workspaceId/connections/:connectionId',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const connectionId = req.params.connectionId as string;
      const scopedDb = req.scopedDb!;

      const connection = await scopedDb.adAccountConnection.findFirst({
        where: { id: connectionId },
      });

      if (!connection) {
        res.status(404).json({ error: 'Connection not found in this workspace.' });
        return;
      }

      await prisma.adAccountConnection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.DISCONNECTED },
      });

      logger.info({ workspaceId: req.workspaceId, connectionId }, 'Ad account connection disconnected');

      res.json({ message: 'Ad account disconnected successfully.' });
    } catch (err) {
      logger.error({ err }, 'Error disconnecting ad account');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);
