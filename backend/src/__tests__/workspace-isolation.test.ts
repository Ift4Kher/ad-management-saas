/**
 * Integration Test: Multi-Tenant Workspace Data Isolation
 *
 * Verifies that the Prisma `$extends` workspace scoping helper (`getScopedDb`)
 * strictly isolates data between workspaces.
 *
 * TEST REQUIREMENTS:
 * - Attempting to fetch Workspace B's campaign data using a Workspace A scope MUST be rejected or return empty.
 * - Every workspace query MUST be scoped to the specified workspace ID.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, getScopedDb } from '../lib/db.js';
import { Platform, CampaignStatus } from '@prisma/client';

describe('Workspace Data Isolation', () => {
  let workspaceAlphaId: string;
  let workspaceBetaId: string;
  let campaignAlphaId: string;
  let campaignBetaId: string;

  beforeAll(async () => {
    // 1. Fetch or create two test workspaces
    const existingWorkspaces = await prisma.workspace.findMany({ take: 2 });

    if (existingWorkspaces.length >= 2) {
      workspaceAlphaId = existingWorkspaces[0].id;
      workspaceBetaId = existingWorkspaces[1].id;
    } else {
      // Create fallback dummy user & workspaces if seed hasn't run
      const user = await prisma.user.create({
        data: {
          name: 'Isolation Test User',
          email: `iso_test_${Date.now()}@adsync.test`,
          passwordHash: 'dummy_hash',
        },
      });

      const wsA = await prisma.workspace.create({
        data: { name: 'Isolation WS A', ownerId: user.id },
      });
      const wsB = await prisma.workspace.create({
        data: { name: 'Isolation WS B', ownerId: user.id },
      });

      workspaceAlphaId = wsA.id;
      workspaceBetaId = wsB.id;
    }

    // 2. Create a campaign in Workspace Alpha using scoped client
    const dbAlpha = getScopedDb(workspaceAlphaId);
    const campaignAlpha = await dbAlpha.campaign.create({
      data: {
        platform: Platform.GOOGLE,
        objective: 'SEARCH_LEADS',
        status: CampaignStatus.ACTIVE,
        budget: 500.0,
      },
    });
    campaignAlphaId = campaignAlpha.id;

    // 3. Create a campaign in Workspace Beta using scoped client
    const dbBeta = getScopedDb(workspaceBetaId);
    const campaignBeta = await dbBeta.campaign.create({
      data: {
        platform: Platform.META,
        objective: 'CONVERSIONS',
        status: CampaignStatus.PAUSED,
        budget: 1200.0,
      },
    });
    campaignBetaId = campaignBeta.id;
  });

  afterAll(async () => {
    // Clean up created campaigns
    if (campaignAlphaId) {
      await prisma.campaign.deleteMany({ where: { id: { in: [campaignAlphaId, campaignBetaId] } } });
    }
    await prisma.$disconnect();
  });

  it('should return ONLY Workspace Alpha campaigns when queried with Workspace Alpha scope', async () => {
    const dbAlpha = getScopedDb(workspaceAlphaId);
    const campaigns = await dbAlpha.campaign.findMany();

    const returnedIds = campaigns.map((c) => c.id);
    expect(returnedIds).toContain(campaignAlphaId);
    expect(returnedIds).not.toContain(campaignBetaId);
  });

  it('should return ONLY Workspace Beta campaigns when queried with Workspace Beta scope', async () => {
    const dbBeta = getScopedDb(workspaceBetaId);
    const campaigns = await dbBeta.campaign.findMany();

    const returnedIds = campaigns.map((c) => c.id);
    expect(returnedIds).toContain(campaignBetaId);
    expect(returnedIds).not.toContain(campaignAlphaId);
  });

  it('should return null when trying to fetch Workspace B campaign using Workspace A scope', async () => {
    const dbAlpha = getScopedDb(workspaceAlphaId);
    const result = await dbAlpha.campaign.findFirst({
      where: { id: campaignBetaId },
    });

    expect(result).toBeNull();
  });

  it('should count only campaigns belonging to the scoped workspace', async () => {
    const dbAlpha = getScopedDb(workspaceAlphaId);
    const countAlpha = await dbAlpha.campaign.count({ where: { id: campaignAlphaId } });
    const countBetaInAlphaScope = await dbAlpha.campaign.count({ where: { id: campaignBetaId } });

    expect(countAlpha).toBe(1);
    expect(countBetaInAlphaScope).toBe(0);
  });
});
