/**
 * Integration Test Suite: Ad Account Connections & Token Security
 *
 * HARD SECURITY REQUIREMENTS:
 * 1. Tokens are NEVER exposed in any API response body to the frontend.
 * 2. OAuth tokens are encrypted using AES-256-GCM before writing to PostgreSQL (`v1:...`).
 * 3. Proactive token refresh worker processes expiring tokens and logs failures.
 * 4. Unverified email users or VIEWER roles are blocked from connecting accounts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { prisma } from '../lib/db.js';
import { connectionsRouter } from '../routes/connections.js';
import { authRouter } from '../routes/auth.js';
import { generateToken } from '../lib/jwt.js';
import { encryptToken, decryptToken } from '../lib/encryption.js';
import { executeTokenRefreshBatch } from '../lib/token-refresh-job.js';
import { Platform, ConnectionStatus, WorkspaceRole } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', connectionsRouter);

const request = supertest(app);

describe('Ad Account Connections & Security Tests', () => {
  const userEmail = `conn_owner_${Date.now()}@adsync.test`;
  let token: string;
  let userId: string;
  let workspaceId: string;
  let connectionId: string;

  beforeAll(async () => {
    // 1. Sign up test user
    const res = await request.post('/api/auth/signup').send({
      name: 'Connections Owner',
      email: userEmail,
      password: 'Password123!',
    });
    token = res.body.token;
    userId = res.body.user.id;
    workspaceId = res.body.workspace.id;

    // Verify email for user
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    // 2. Create a test connection with encrypted tokens in database
    const conn = await prisma.adAccountConnection.create({
      data: {
        workspaceId,
        platform: Platform.GOOGLE,
        accessTokenEncrypted: encryptToken('raw_secret_access_token_google_123'),
        refreshTokenEncrypted: encryptToken('raw_secret_refresh_token_google_456'),
        status: ConnectionStatus.CONNECTED,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
    connectionId = conn.id;
  });

  afterAll(async () => {
    await prisma.adAccountConnection.deleteMany({ where: { workspaceId } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('MUST NOT expose encrypted or raw tokens in GET connections API response', async () => {
    const res = await request
      .get(`/api/workspaces/${workspaceId}/connections`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.connections).toBeDefined();
    expect(res.body.connections.length).toBeGreaterThanOrEqual(1);

    const firstConn = res.body.connections[0];

    // Assert safe metadata properties ARE returned
    expect(firstConn.id).toBeDefined();
    expect(firstConn.platform).toBe('GOOGLE');
    expect(firstConn.status).toBe('CONNECTED');
    expect(firstConn.connectedAt).toBeDefined();

    // STRICT SECURITY ASSERTION: Token fields MUST NOT be present
    expect(firstConn.accessTokenEncrypted).toBeUndefined();
    expect(firstConn.refreshTokenEncrypted).toBeUndefined();
    expect(firstConn.accessToken).toBeUndefined();
    expect(firstConn.refreshToken).toBeUndefined();
  });

  it('should encrypt tokens at rest in database during OAuth callback', async () => {
    // Initiate OAuth connect
    const connectRes = await request
      .get(`/api/workspaces/${workspaceId}/connections/meta/connect`)
      .set('Authorization', `Bearer ${token}`);

    expect(connectRes.status).toBe(200);
    expect(connectRes.body.authUrl).toBeDefined();

    // Extract state from authUrl
    const urlParams = new URLSearchParams(connectRes.body.authUrl.split('?')[1]);
    const state = urlParams.get('state');

    // Simulate OAuth callback
    const callbackRes = await request.get(`/api/auth/oauth/callback?code=mock_code_test_meta&state=${encodeURIComponent(state!)}`);

    expect(callbackRes.status).toBe(302); // Redirect to frontend
    expect(callbackRes.headers.location).toContain('/dashboard/connections?status=success&platform=META');

    // Inspect database directly to verify encryption
    const metaConn = await prisma.adAccountConnection.findFirst({
      where: { workspaceId, platform: Platform.META },
    });

    expect(metaConn).not.toBeNull();
    expect(metaConn!.accessTokenEncrypted).toMatch(/^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(decryptToken(metaConn!.accessTokenEncrypted)).toContain('mock_meta_access_token');
  });

  it('should execute proactive token refresh batch and update expiring tokens in DB', async () => {
    // Create an expiring connection (expires in 10 minutes)
    const expiringConn = await prisma.adAccountConnection.create({
      data: {
        workspaceId,
        platform: Platform.TIKTOK,
        accessTokenEncrypted: encryptToken('old_tiktok_access_token'),
        refreshTokenEncrypted: encryptToken('mock_tiktok_refresh_token'),
        status: ConnectionStatus.CONNECTED,
        tokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now (within 30m threshold)
      },
    });

    // Execute token refresh batch
    const result = await executeTokenRefreshBatch();

    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(result.refreshed).toBeGreaterThanOrEqual(1);

    // Verify connection in database has updated expiration and re-encrypted token
    const updatedConn = await prisma.adAccountConnection.findUnique({
      where: { id: expiringConn.id },
    });

    expect(updatedConn).not.toBeNull();
    expect(updatedConn!.status).toBe(ConnectionStatus.CONNECTED);
    expect(new Date(updatedConn!.tokenExpiresAt!).getTime()).toBeGreaterThan(Date.now() + 3000 * 1000);
    expect(decryptToken(updatedConn!.accessTokenEncrypted)).toContain('mock_refreshed_tiktok');
  });

  it('should BLOCK a user with unverified email from connecting accounts', async () => {
    // Create unverified user
    const unverifiedUser = await prisma.user.create({
      data: {
        name: 'Unverified User',
        email: `unverified_${Date.now()}@adsync.test`,
        passwordHash: 'dummy_hash',
        emailVerifiedAt: null,
      },
    });

    const unverifiedWs = await prisma.workspace.create({
      data: { name: 'Unverified WS', ownerId: unverifiedUser.id },
    });

    await prisma.workspaceMember.create({
      data: { userId: unverifiedUser.id, workspaceId: unverifiedWs.id, role: WorkspaceRole.OWNER },
    });

    const unverifiedToken = generateToken({ userId: unverifiedUser.id, email: unverifiedUser.email });

    const res = await request
      .get(`/api/workspaces/${unverifiedWs.id}/connections/google/connect`)
      .set('Authorization', `Bearer ${unverifiedToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Email verification required');

    // Clean up
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: unverifiedWs.id } });
    await prisma.workspace.delete({ where: { id: unverifiedWs.id } });
    await prisma.user.delete({ where: { id: unverifiedUser.id } });
  }, 15000);
});
