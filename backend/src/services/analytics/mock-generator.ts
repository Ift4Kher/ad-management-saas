/**
 * Mock Performance Data Generator
 *
 * MOCK GENERATOR SWAP POINT:
 * -----------------------------------------------------------------------------
 * THIS FILE GENERATES REALISTIC MOCK AD PERFORMANCE REPORTING METRICS.
 * TO REPLACE WITH LIVE/SYNCED REPORTING DATA IN THE FUTURE:
 * 1. Implement a real data-sync worker that writes daily ad metrics into a database table
 *    or query BigQuery / Snowflake / ClickHouse directly.
 * 2. Swap the implementation of `generateDailyMetricsForCampaign` or `fetchCampaignMetrics`
 *    in `analytics-service.ts` to query that table/warehouse instead of calling this generator.
 * THE DASHBOARD UI LAYER AND API CONTRACT REMAIN UNCHANGED.
 * -----------------------------------------------------------------------------
 */

import type { Platform } from '@prisma/client';

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  campaignId: string;
  campaignName: string;
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

/**
 * Deterministic pseudo-random number generator using seed (for consistent mock metrics)
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate daily performance metrics for a specific campaign between startDate and endDate.
 */
export function generateDailyMetricsForCampaign(
  campaign: {
    id: string;
    name: string;
    platform: Platform;
    objective: string;
    budget: number;
    createdAt: Date;
  },
  startDate: Date,
  endDate: Date,
): DailyMetric[] {
  const metrics: DailyMetric[] = [];

  // Platform performance baselines
  const platformConfig: Record<Platform, { cpm: number; ctr: number; roasBase: number }> = {
    GOOGLE: { cpm: 18.5, ctr: 0.038, roasBase: 4.2 },
    META: { cpm: 12.0, ctr: 0.021, roasBase: 3.5 },
    TIKTOK: { cpm: 7.5, ctr: 0.024, roasBase: 2.9 },
  };

  const config = platformConfig[campaign.platform] || platformConfig.META;

  // Objective conversion rate baselines
  const objLower = (campaign.objective || 'SALES').toUpperCase();
  let conversionRate = 0.04; // default Sales 4%
  if (objLower.includes('LEAD')) conversionRate = 0.08;
  if (objLower.includes('AWARENESS') || objLower.includes('REACH')) conversionRate = 0.01;
  if (objLower.includes('TRAFFIC') || objLower.includes('CLICK')) conversionRate = 0.025;

  const dailyBudget = Number(campaign.budget) || 100;

  // Iterate date by date
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  let dayIndex = 0;
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];

    // Seed combining campaign ID char codes and day timestamp for stability
    const charSum = campaign.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const seed = charSum + current.getTime() + dayIndex;

    // Introduce realistic ±20% daily fluctuation
    const variance = 0.8 + seededRandom(seed) * 0.4;
    const spend = Math.round(dailyBudget * variance * 100) / 100;

    // Calculate metrics
    const impressions = Math.round((spend / config.cpm) * 1000);
    const clicks = Math.round(impressions * (config.ctr * (0.9 + seededRandom(seed + 1) * 0.2)));
    const conversions = Math.max(1, Math.round(clicks * conversionRate * (0.85 + seededRandom(seed + 2) * 0.3)));

    const roas = Math.round((config.roasBase * (0.85 + seededRandom(seed + 3) * 0.3)) * 100) / 100;

    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const cpa = conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0;

    metrics.push({
      date: dateStr,
      campaignId: campaign.id,
      campaignName: campaign.name,
      platform: campaign.platform,
      spend,
      impressions,
      clicks,
      conversions,
      roas,
      ctr,
      cpc,
      cpa,
    });

    current.setUTCDate(current.getUTCDate() + 1);
    dayIndex++;
  }

  return metrics;
}
