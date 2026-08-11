/**
 * Integration Test Suite: Auth, RBAC & Workspace Access Control
 *
 * HARD SECURITY REQUIREMENTS:
 * 1. User signup auto-creates default workspace and sets user as OWNER.
 * 2. Password authentication uses bcrypt.
 * 3. Viewer role is blocked (HTTP 403) from write actions (e.g. creating campaigns).
 * 4. Users cannot access another workspace's routes even with a valid session (HTTP 403).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { prisma } from '../lib/db.js';
import { authRouter } from '../routes/auth.js';
import { workspacesRouter } from '../routes/workspaces.js';
import { generateToken, generateActionToken } from '../lib/jwt.js';
import { WorkspaceRole } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspacesRouter);

const request = supertest(app);

describe('Auth & RBAC Integration Tests', () => {
  const testEmailAlpha = `test_alpha_${Date.now()}@adsync.test`;
  const testEmailBeta = `test_beta_${Date.now()}@adsync.test`;
  const password = 'SecretPassword123!';

  let tokenAlpha: string;
  let userAlphaId: string;
  let workspaceAlphaId: string;

  let tokenBeta: string;
  let userBetaId: string;
  let workspaceBetaId: string;

  beforeAll(async () => {
    // 1. Sign up Alpha User
    const resAlpha = await request.post('/api/auth/signup').send({
      name: 'Alpha Tester',
      email: testEmailAlpha,
      password,
    });
    expect(resAlpha.status).toBe(201);
    tokenAlpha = resAlpha.body.token;
    userAlphaId = resAlpha.body.user.id;
    workspaceAlphaId = resAlpha.body.workspace.id;

    // 2. Sign up Beta User
    const resBeta = await request.post('/api/auth/signup').send({
      name: 'Beta Tester',
      email: testEmailBeta,
      password,
    });
    expect(resBeta.status).toBe(201);
    tokenBeta = resBeta.body.token;
    userBetaId = resBeta.body.user.id;
    workspaceBetaId = resBeta.body.workspace.id;
  });

  afterAll(async () => {
    // Cleanup created users & workspaces
    await prisma.workspaceMember.deleteMany({
      where: { userId: { in: [userAlphaId, userBetaId] } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceAlphaId, workspaceBetaId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAlphaId, userBetaId] } },
    });
    await prisma.$disconnect();
  });

  it('should authenticate user via login with valid bcrypt password', async () => {
    const res = await request.post('/api/auth/login').send({
      email: testEmailAlpha,
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmailAlpha);
    expect(res.body.workspaces.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject login with wrong password', async () => {
    const res = await request.post('/api/auth/login').send({
      email: testEmailAlpha,
      password: 'WrongPassword999!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('should verify email address when valid verification token is provided', async () => {
    const token = generateActionToken({ userId: userAlphaId, type: 'VERIFY_EMAIL' });
    const res = await request.post('/api/auth/verify-email').send({ token });

    expect(res.status).toBe(200);
    expect(res.body.emailVerifiedAt).toBeDefined();

    const userInDb = await prisma.user.findUnique({ where: { id: userAlphaId } });
    expect(userInDb?.emailVerifiedAt).not.toBeNull();
  });

  it('should REJECT a valid user session from accessing another workspace route', async () => {
    // User Alpha attempting to access Workspace Beta details
    const res = await request
      .get(`/api/workspaces/${workspaceBetaId}`)
      .set('Authorization', `Bearer ${tokenAlpha}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied. You are not a member of this workspace.');
  });

  it('should BLOCK a VIEWER role from executing write actions (HTTP 403)', async () => {
    // Add User Beta to Workspace Alpha with VIEWER role
    await prisma.workspaceMember.create({
      data: {
        userId: userBetaId,
        workspaceId: workspaceAlphaId,
        role: WorkspaceRole.VIEWER,
      },
    });

    // Ensure User Beta email is verified
    await prisma.user.update({
      where: { id: userBetaId },
      data: { emailVerifiedAt: new Date() },
    });

    // User Beta (VIEWER) attempts write action: creating a campaign in Workspace Alpha
    const res = await request
      .post(`/api/workspaces/${workspaceAlphaId}/campaigns`)
      .set('Authorization', `Bearer ${tokenBeta}`)
      .send({
        platform: 'GOOGLE',
        objective: 'BRAND_AWARENESS',
        budget: 250,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Action requires 'EDITOR' role, but your role is 'VIEWER'");
  });

  it('should ALLOW an EDITOR or OWNER role to execute write actions', async () => {
    // User Alpha (OWNER) attempts write action: creating a campaign in Workspace Alpha
    const res = await request
      .post(`/api/workspaces/${workspaceAlphaId}/campaigns`)
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .send({
        name: 'Test Campaign Alpha',
        platform: 'META',
        objective: 'LEADS',
        budget: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.campaign.id).toBeDefined();
  });
});
