'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import { AnalyticsTrendChart, AnalyticsPlatformBarChart } from '@/components/AnalyticsCharts';

interface AnalyticsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageRoas: number;
  averageCtr: number;
  averageCpc: number;
  averageCpa: number;
}

interface TrendDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

interface PlatformComparison {
  platform: 'GOOGLE' | 'META' | 'TIKTOK';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  shareOfSpend: number;
}

interface CampaignPerformanceSummary {
  id: string;
  name: string;
  platform: 'GOOGLE' | 'META' | 'TIKTOK';
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

interface AnalyticsData {
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

const PLATFORM_NAMES = {
  GOOGLE: 'Google Ads',
  META: 'Meta Ads',
  TIKTOK: 'TikTok Ads',
};

export default function AnalyticsPage() {
  const { activeWorkspace, authFetch } = useAuth();
  const { t } = useTranslation();

  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [campaignList, setCampaignList] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaign dropdown options
  useEffect(() => {
    if (activeWorkspace) {
      authFetch(`/api/workspaces/${activeWorkspace.id}/campaigns`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          if (data.campaigns) {
            setCampaignList(data.campaigns.map((c: any) => ({ id: c.id, name: c.name })));
          }
        })
        .catch(() => {});
    }
  }, [activeWorkspace]);

  // Fetch Analytics data matching active filters
  const fetchAnalytics = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        period,
        platform: platformFilter,
        campaignId: selectedCampaignId,
      });

      const res = await authFetch(`/api/workspaces/${activeWorkspace.id}/analytics?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load analytics report.');

      const data: AnalyticsData = await res.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching analytics.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, period, platformFilter, selectedCampaignId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Client-side CSV Export Generator
  const handleExportCSV = () => {
    if (!analytics) return;

    const headers = [
      'Date Range',
      'Campaign Name',
      'Platform',
      'Spend ($)',
      'Impressions',
      'Clicks',
      'Conversions',
      'ROAS (x)',
      'CTR (%)',
      'CPC ($)',
      'CPA ($)',
    ];

    const rows: string[][] = [];

    if (analytics.campaignPerformance.length > 0) {
      analytics.campaignPerformance.forEach((cp) => {
        rows.push([
          `"${analytics.meta.startDate} to ${analytics.meta.endDate}"`,
          `"${cp.name.replace(/"/g, '""')}"`,
          cp.platform,
          cp.spend.toFixed(2),
          cp.impressions.toString(),
          cp.clicks.toString(),
          cp.conversions.toString(),
          cp.roas.toFixed(2),
          `${cp.ctr.toFixed(2)}%`,
          `$${cp.cpc.toFixed(2)}`,
          `$${cp.cpa.toFixed(2)}`,
        ]);
      });
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `adsync_analytics_${activeWorkspace?.name || 'export'}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeWorkspace) return null;

  return (
    <main className="mx-auto flex-1 w-full max-w-7xl px-6 py-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {t('analytics.title', 'Unified Performance Dashboard')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t('analytics.subtitle', 'Cross-platform campaign analytics, spend breakdown, and return on ad spend.')}
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="inline-flex rounded-[var(--radius-md)] border border-neutral-200 bg-neutral-100 p-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors ${
                  period === p
                    ? 'bg-surface text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Platform Selector */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-[var(--radius-md)] border border-neutral-200 bg-surface px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:border-neutral-300 focus:outline-none"
          >
            <option value="ALL">All Platforms</option>
            <option value="GOOGLE">Google Ads</option>
            <option value="META">Meta Ads</option>
            <option value="TIKTOK">TikTok Ads</option>
          </select>

          {/* Campaign Selector */}
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="max-w-[200px] truncate rounded-[var(--radius-md)] border border-neutral-200 bg-surface px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:border-neutral-300 focus:outline-none"
          >
            <option value="ALL">All Campaigns</option>
            {campaignList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Export CSV CTA */}
          <button
            onClick={handleExportCSV}
            disabled={!analytics || loading}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-neutral-200 bg-surface px-4 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      {analytics && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-8">
          {/* Card 1: Total Spend */}
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Spend</span>
            <div className="mt-2 text-2xl font-extrabold text-neutral-900">
              ${analytics.summary.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] font-medium text-neutral-500">
              Across {analytics.meta.campaignCount} active campaign(s)
            </div>
          </div>

          {/* Card 2: Impressions */}
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Impressions</span>
            <div className="mt-2 text-2xl font-extrabold text-neutral-900">
              {analytics.summary.totalImpressions.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-medium text-neutral-500">
              CPM: ${(analytics.summary.totalSpend / (analytics.summary.totalImpressions / 1000 || 1)).toFixed(2)}
            </div>
          </div>

          {/* Card 3: Clicks & CTR */}
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Clicks & CTR</span>
            <div className="mt-2 text-2xl font-extrabold text-neutral-900">
              {analytics.summary.totalClicks.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-medium text-success">
              CTR: {analytics.summary.averageCtr}% (CPC: ${analytics.summary.averageCpc})
            </div>
          </div>

          {/* Card 4: Conversions */}
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Conversions</span>
            <div className="mt-2 text-2xl font-extrabold text-neutral-900">
              {analytics.summary.totalConversions.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-medium text-neutral-500">
              CPA: ${analytics.summary.averageCpa}
            </div>
          </div>

          {/* Card 5: ROAS */}
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Avg. ROAS</span>
            <div className="mt-2 text-2xl font-extrabold text-primary">
              {analytics.summary.averageRoas}x
            </div>
            <div className="mt-1 text-[11px] font-medium text-success">
              Return on Ad Spend
            </div>
          </div>
        </div>
      )}

      {/* Visual Analytics Grid */}
      {analytics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
          <AnalyticsTrendChart
            trendData={analytics.trendData}
            startDate={analytics.meta.startDate}
            endDate={analytics.meta.endDate}
          />
          <AnalyticsPlatformBarChart platformComparison={analytics.platformComparison} />
        </div>
      )}

      {/* Campaign Performance Table */}
      {analytics && (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface shadow-xs overflow-hidden">
          <div className="border-b border-neutral-200 px-6 py-4">
            <h3 className="text-base font-bold text-neutral-900">Campaign Performance Breakdown</h3>
            <p className="text-xs text-neutral-500">Individual metrics per campaign for the selected date range</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[11px] text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Campaign</th>
                  <th className="px-4 py-3.5 font-semibold">Platform</th>
                  <th className="px-4 py-3.5 font-semibold">Objective</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Spend</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Impressions</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Clicks</th>
                  <th className="px-4 py-3.5 font-semibold text-right">CTR</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Conversions</th>
                  <th className="px-4 py-3.5 font-semibold text-right">CPA</th>
                  <th className="px-6 py-3.5 font-semibold text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {analytics.campaignPerformance.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-neutral-900">{c.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.platform === 'GOOGLE' ? 'bg-blue-50 text-blue-700' :
                        c.platform === 'META' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {PLATFORM_NAMES[c.platform] || c.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600">{c.objective}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-neutral-900">${c.spend.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600">{c.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600">{c.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600">{c.ctr}%</td>
                    <td className="px-4 py-3.5 text-right font-medium text-neutral-900">{c.conversions.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600">${c.cpa}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-primary">{c.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
