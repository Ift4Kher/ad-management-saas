/**
 * Analytics Aggregation Service
 *
 * Provides workspace-level performance reporting data by combining campaign metadata
 * with reporting metrics.
 *
 * SWAP POINT NOTE:
 * Uses `generateDailyMetricsForCampaign` from `analytics/mock-generator.ts`.
 * When connecting live ad platform APIs or a data warehouse (BigQuery), swap the generator call
 * with a query against the analytics database table. The return contract remains identical.
 */

import type { Platform } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { generateDailyMetricsForCampaign, type DailyMetric } from './analytics/mock-generator.js';

export interface AnalyticsFilterOptions {
  period?: '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
  platform?: Platform | 'ALL';
  campaignId?: string | 'ALL';
}

export interface AnalyticsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageRoas: number;
  averageCtr: number;
  averageCpc: number;
  averageCpa: number;
}

export interface TrendDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

export interface PlatformComparison {
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  shareOfSpend: number;
}

export interface CampaignPerformanceSummary {
  id: string;
  name: string;
  platform: Platform;
  objective: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  trendData: TrendDataPoint[];
  platformComparison: PlatformComparison[];
  campaignPerformance: CampaignPerformanceSummary[];
  meta: {
    period: string;
    startDate: string;
    endDate: string;
    campaignCount: number;
    executionTimeMs: number;
  };
}

/**
 * Helper to calculate date range based on period option
 */
function resolveDateRange(options: AnalyticsFilterOptions): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date();

  if (options.period === '90d') {
    start.setDate(end.getDate() - 90);
  } else if (options.period === '30d') {
    start.setDate(end.getDate() - 30);
  } else if (options.period === 'custom' && options.startDate && options.endDate) {
    start = new Date(options.startDate);
    const customEnd = new Date(options.endDate);
    if (!isNaN(customEnd.getTime())) {
      return { start, end: customEnd };
    }
  } else {
    // Default 7d
    start.setDate(end.getDate() - 7);
  }

  return { start, end };
}

/**
 * Fetch and aggregate analytics data for a workspace based on filter criteria.
 */
export async function getWorkspaceAnalytics(
  workspaceId: string,
  options: AnalyticsFilterOptions = {},
): Promise<AnalyticsResponse> {
  const startTime = Date.now();

  const { start, end } = resolveDateRange(options);

  // 1. Fetch campaigns for workspace matching platform & campaignId filters
  const campaignWhere: Record<string, unknown> = { workspaceId };

  if (options.platform && options.platform !== 'ALL') {
    campaignWhere.platform = options.platform;
  }

  if (options.campaignId && options.campaignId !== 'ALL') {
    campaignWhere.id = options.campaignId;
  }

  const campaigns = await prisma.campaign.findMany({
    where: campaignWhere,
    select: {
      id: true,
      name: true,
      platform: true,
      objective: true,
      status: true,
      budget: true,
      createdAt: true,
    },
  });

  // 2. Collect all daily metrics across selected campaigns
  const allDailyMetrics: DailyMetric[] = [];
  const campaignMap = new Map<string, CampaignPerformanceSummary>();

  for (const campaign of campaigns) {
    const dailyList = generateDailyMetricsForCampaign(
      {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        objective: campaign.objective,
        budget: Number(campaign.budget),
        createdAt: campaign.createdAt,
      },
      start,
      end,
    );

    allDailyMetrics.push(...dailyList);

    // Initialize campaign summary stats
    let cSpend = 0;
    let cImp = 0;
    let cClicks = 0;
    let cConv = 0;
    let cRoasSum = 0;

    for (const m of dailyList) {
      cSpend += m.spend;
      cImp += m.impressions;
      cClicks += m.clicks;
      cConv += m.conversions;
      cRoasSum += m.roas;
    }

    const count = dailyList.length || 1;
    const avgRoas = Math.round((cRoasSum / count) * 100) / 100;
    const ctr = cImp > 0 ? Math.round((cClicks / cImp) * 10000) / 100 : 0;
    const cpc = cClicks > 0 ? Math.round((cSpend / cClicks) * 100) / 100 : 0;
    const cpa = cConv > 0 ? Math.round((cSpend / cConv) * 100) / 100 : 0;

    campaignMap.set(campaign.id, {
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      objective: campaign.objective,
      status: campaign.status,
      spend: Math.round(cSpend * 100) / 100,
      impressions: cImp,
      clicks: cClicks,
      conversions: cConv,
      roas: avgRoas,
      ctr,
      cpc,
      cpa,
    });
  }

  // 3. Aggregate totals for Summary
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let roasWeightedSum = 0;

  for (const m of allDailyMetrics) {
    totalSpend += m.spend;
    totalImpressions += m.impressions;
    totalClicks += m.clicks;
    totalConversions += m.conversions;
    roasWeightedSum += m.roas * m.spend;
  }

  totalSpend = Math.round(totalSpend * 100) / 100;
  const averageRoas = totalSpend > 0 ? Math.round((roasWeightedSum / totalSpend) * 100) / 100 : 0;
  const averageCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;
  const averageCpc = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0;
  const averageCpa = totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0;

  // 4. Aggregate Trend Data by Date
  const trendMap = new Map<string, TrendDataPoint>();

  for (const m of allDailyMetrics) {
    const existing = trendMap.get(m.date) || {
      date: m.date,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      roas: 0,
    };

    existing.spend += m.spend;
    existing.impressions += m.impressions;
    existing.clicks += m.clicks;
    existing.conversions += m.conversions;

    trendMap.set(m.date, existing);
  }

  const trendData = Array.from(trendMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      spend: Math.round(d.spend * 100) / 100,
      roas: d.spend > 0 ? Math.round(((d.conversions * 45) / d.spend) * 100) / 100 : 0,
    }));

  // 5. Aggregate Platform Comparison
  const platformMap = new Map<Platform, { spend: number; imp: number; clicks: number; conv: number; roasSum: number; count: number }>();

  const platformsList: Platform[] = ['GOOGLE', 'META', 'TIKTOK'];
  for (const p of platformsList) {
    platformMap.set(p, { spend: 0, imp: 0, clicks: 0, conv: 0, roasSum: 0, count: 0 });
  }

  for (const m of allDailyMetrics) {
    const stats = platformMap.get(m.platform)!;
    stats.spend += m.spend;
    stats.imp += m.impressions;
    stats.clicks += m.clicks;
    stats.conv += m.conversions;
    stats.roasSum += m.roas;
    stats.count++;
  }

  const platformComparison: PlatformComparison[] = Array.from(platformMap.entries()).map(([platform, stats]) => {
    const pSpend = Math.round(stats.spend * 100) / 100;
    const shareOfSpend = totalSpend > 0 ? Math.round((pSpend / totalSpend) * 1000) / 10 : 0;
    const avgRoas = stats.count > 0 ? Math.round((stats.roasSum / stats.count) * 100) / 100 : 0;

    return {
      platform,
      spend: pSpend,
      impressions: stats.imp,
      clicks: stats.clicks,
      conversions: stats.conv,
      roas: avgRoas,
      shareOfSpend,
    };
  });

  const duration = Date.now() - startTime;

  return {
    summary: {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      averageRoas,
      averageCtr,
      averageCpc,
      averageCpa,
    },
    trendData,
    platformComparison,
    campaignPerformance: Array.from(campaignMap.values()),
    meta: {
      period: options.period || '7d',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      campaignCount: campaigns.length,
      executionTimeMs: duration,
    },
  };
}
