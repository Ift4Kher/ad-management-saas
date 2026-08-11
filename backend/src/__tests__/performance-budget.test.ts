/**
 * Integration Test: Analytics Performance Budget Benchmark
 *
 * REQUIREMENTS:
 * - Product performance SLA requires sub-2-second (< 2000ms) load time
 *   for the analytics dashboard when a workspace contains 50 campaigns.
 *
 * TEST FLOW:
 * 1. Create a test workspace and seed 50 campaigns with varied platforms & budgets.
 * 2. Invoke `getWorkspaceAnalytics` across a 30-day reporting window.
 * 3. Measure total execution time.
 * 4. Assert execution time < 2000ms.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/db.js';
import { Platform, CampaignStatus } from '@prisma/client';
import { getWorkspaceAnalytics } from '../services/analytics-service.js';

describe('Analytics Performance Budget (50 Campaigns Scale)', () => {
  let workspaceId: string;

  beforeAll(async () => {
    // Create a benchmark test workspace
    const user = await prisma.user.create({
      data: {
        name: 'Benchmark User',
        email: `perf_test_${Date.now()}@adsync.test`,
        passwordHash: 'dummy_hash',
      },
    });

    const ws = await prisma.workspace.create({
      data: {
        name: 'Benchmark Workspace (50 Campaigns)',
        ownerId: user.id,
      },
    });

    workspaceId = ws.id;

    // Batch create 50 campaigns across Google, Meta, and TikTok
    const platforms: Platform[] = [Platform.GOOGLE, Platform.META, Platform.TIKTOK];
    const objectives = ['SALES', 'LEADS', 'AWARENESS', 'TRAFFIC'];

    const campaignDataList = Array.from({ length: 50 }).map((_, i) => ({
      workspaceId,
      name: `Scale Campaign #${i + 1}`,
      platform: platforms[i % 3],
      objective: objectives[i % 4],
      budget: (i + 1) * 20 + 50,
      status: CampaignStatus.ACTIVE,
    }));

    await prisma.campaign.createMany({
      data: campaignDataList,
    });
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.campaign.deleteMany({ where: { workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it('should process analytics for 50 campaigns in under 2000ms (sub-2-second target)', async () => {
    const startTime = performance.now();

    const result = await getWorkspaceAnalytics(workspaceId, {
      period: '30d',
      platform: 'ALL',
      campaignId: 'ALL',
    });

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    console.log(`\n⏱️ Benchmark Result: 50 campaigns, 30 days data generated & aggregated in ${durationMs}ms`);
    console.log(`📊 Total Spend: $${result.summary.totalSpend.toLocaleString()}, Impressions: ${result.summary.totalImpressions.toLocaleString()}, ROAS: ${result.summary.averageRoas}x\n`);

    expect(result.meta.campaignCount).toBe(50);
    expect(result.trendData.length).toBeGreaterThan(0);
    expect(result.summary.totalSpend).toBeGreaterThan(0);

    // Hard performance SLA check: must be < 2000ms
    expect(durationMs).toBeLessThan(2000);
  });
});
