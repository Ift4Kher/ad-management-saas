import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/db.js';
import { createRule, evaluateRulesForWorkspace, confirmNotificationAction } from '../services/rules-service.js';
import { CampaignStatus, Platform } from '@prisma/client';

describe('Phase 8 Automation Rules Engine & Safety Guardrail Integration Tests', () => {
  let workspaceId: string;
  let userId: string;
  let campaignId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `rules-test-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Rules Test User',
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    // Create test workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Rules Test Workspace',
        ownerId: user.id,
      },
    });
    workspaceId = workspace.id;

    // Create test campaign
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name: 'High Spend Test Campaign',
        platform: Platform.GOOGLE,
        objective: 'CONVERSIONS',
        status: CampaignStatus.ACTIVE,
        budget: 500.0,
      },
    });
    campaignId = campaign.id;
  });

  afterAll(async () => {
    // Cleanup
    if (workspaceId) {
      await prisma.notification.deleteMany({ where: { workspaceId } });
      await prisma.automationRule.deleteMany({ where: { workspaceId } });
      await prisma.campaign.deleteMany({ where: { workspaceId } });
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it('1. should create an automation rule to pause campaign if spend exceeds $10.00', async () => {
    const rule = await createRule(workspaceId, {
      name: 'Pause High Spend',
      metric: 'SPEND',
      operator: 'GREATER_THAN',
      threshold: 10.0,
      action: 'PAUSE',
      campaignId,
    });

    expect(rule.id).toBeDefined();
    expect(rule.action).toBe('PAUSE');
    expect(Number(rule.threshold)).toBe(10.0);
  });

  it('2. should evaluate rule and create PENDING_CONFIRMATION without pausing campaign silently (Money-Affecting Guardrail)', async () => {
    const evalResult = await evaluateRulesForWorkspace(workspaceId);

    expect(evalResult.rulesEvaluated).toBeGreaterThanOrEqual(1);
    expect(evalResult.triggeredCount).toBeGreaterThanOrEqual(1);

    // Verify Notification created with PENDING_CONFIRMATION status
    const pendingNotification = await prisma.notification.findFirst({
      where: { workspaceId, campaignId, status: 'PENDING_CONFIRMATION' },
    });

    expect(pendingNotification).toBeDefined();
    expect(pendingNotification?.actionType).toBe('PAUSE_CAMPAIGN');
    expect(pendingNotification?.type).toBe('ACTION_REQUIRED');

    // CRITICAL MONEY-AFFECTING GUARDRAIL VERIFICATION: Campaign MUST STILL BE ACTIVE!
    const campaignCheck = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    expect(campaignCheck?.status).toBe(CampaignStatus.ACTIVE);
  });

  it('3. should execute campaign pause ONLY after explicit user confirmation of the notification', async () => {
    const pendingNotification = await prisma.notification.findFirst({
      where: { workspaceId, campaignId, status: 'PENDING_CONFIRMATION' },
    });
    expect(pendingNotification).toBeDefined();

    // Perform explicit confirmation step
    const confirmed = await confirmNotificationAction(workspaceId, pendingNotification!.id);

    expect(confirmed.status).toBe('CONFIRMED');

    // VERIFY CAMPAIGN STATUS UPDATED TO PAUSED
    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    expect(updatedCampaign?.status).toBe(CampaignStatus.PAUSED);
  });
});
