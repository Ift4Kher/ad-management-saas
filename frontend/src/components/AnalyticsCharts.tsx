'use client';

import React, { useState } from 'react';

export interface TrendDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

export interface PlatformComparison {
  platform: 'GOOGLE' | 'META' | 'TIKTOK';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  shareOfSpend: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  GOOGLE: '#4285F4',
  META: '#1877F2',
  TIKTOK: '#00F2FE',
};

const PLATFORM_LABELS: Record<string, string> = {
  GOOGLE: 'Google Ads',
  META: 'Meta Ads',
  TIKTOK: 'TikTok Ads',
};

/**
 * Pure SVG Responsive Performance Trend Chart (Spend vs Conversions)
 */
export function AnalyticsTrendChart({
  trendData,
  startDate,
  endDate,
}: {
  trendData: TrendDataPoint[];
  startDate: string;
  endDate: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!trendData || trendData.length === 0) {
    return (
      <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-xs flex items-center justify-center h-72">
        <p className="text-xs text-neutral-400">No trend data available for selected period.</p>
      </div>
    );
  }

  const padding = 40;
  const width = 600;
  const height = 240;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxSpend = Math.max(...trendData.map((d) => d.spend), 100);
  const maxConversions = Math.max(...trendData.map((d) => d.conversions), 10);

  // Compute SVG Points
  const pointsSpend = trendData.map((d, i) => {
    const x = padding + (i / Math.max(1, trendData.length - 1)) * graphWidth;
    const y = height - padding - (d.spend / maxSpend) * graphHeight;
    return { x, y, data: d };
  });

  const pointsConv = trendData.map((d, i) => {
    const x = padding + (i / Math.max(1, trendData.length - 1)) * graphWidth;
    const y = height - padding - (d.conversions / maxConversions) * graphHeight;
    return { x, y, data: d };
  });

  const spendPath = pointsSpend.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`,
    '',
  );

  const spendAreaPath = `${spendPath} L ${pointsSpend[pointsSpend.length - 1].x},${height - padding} L ${pointsSpend[0].x},${height - padding} Z`;

  const convPath = pointsConv.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`,
    '',
  );

  const convAreaPath = `${convPath} L ${pointsConv[pointsConv.length - 1].x},${height - padding} L ${pointsConv[0].x},${height - padding} Z`;

  const hoverItem = hoverIndex !== null ? trendData[hoverIndex] : null;

  return (
    <div className="lg:col-span-2 rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-xs relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900">Daily Performance Trends</h3>
          <p className="text-xs text-neutral-500">Daily spend vs. conversion output over time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <span>Spend ($)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Conversions</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="svgSpendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="svgConvGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - padding - ratio * graphHeight;
            return (
              <line
                key={idx}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#F3F4F6"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Spend Area & Line */}
          <path d={spendAreaPath} fill="url(#svgSpendGradient)" />
          <path d={spendPath} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />

          {/* Conversions Area & Line */}
          <path d={convAreaPath} fill="url(#svgConvGradient)" />
          <path d={convPath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />

          {/* Interactive Hover Indicators */}
          {pointsSpend.map((p, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <rect
                x={p.x - graphWidth / (trendData.length * 2)}
                y={padding}
                width={graphWidth / trendData.length}
                height={graphHeight}
                fill="transparent"
              />
              {hoverIndex === i && (
                <>
                  <line x1={p.x} y1={padding} x2={p.x} y2={height - padding} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx={p.x} cy={p.y} r="4" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx={pointsConv[i].x} cy={pointsConv[i].y} r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                </>
              )}
            </g>
          ))}

          {/* X Axis Labels */}
          {trendData.map((d, i) => {
            if (trendData.length > 10 && i % Math.ceil(trendData.length / 6) !== 0 && i !== trendData.length - 1) return null;
            const x = padding + (i / Math.max(1, trendData.length - 1)) * graphWidth;
            return (
              <text key={i} x={x} y={height - 12} textAnchor="middle" fontSize="10" fill="#9CA3AF">
                {d.date.slice(5)}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverItem && (
          <div className="absolute top-2 right-4 rounded-md border border-neutral-200 bg-surface/95 px-3 py-1.5 shadow-md backdrop-blur-xs text-xs">
            <div className="font-semibold text-neutral-800">{hoverItem.date}</div>
            <div className="text-indigo-600 font-medium">Spend: ${hoverItem.spend.toLocaleString()}</div>
            <div className="text-emerald-600 font-medium">Conversions: {hoverItem.conversions}</div>
            <div className="text-neutral-500 font-medium">ROAS: {hoverItem.roas}x</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Pure SVG Responsive Platform Breakdown Bar Chart
 */
export function AnalyticsPlatformBarChart({
  platformComparison,
}: {
  platformComparison: PlatformComparison[];
}) {
  const [hoveredPlatform, setHoveredPlatform] = useState<PlatformComparison | null>(null);

  if (!platformComparison || platformComparison.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-xs flex items-center justify-center h-72">
        <p className="text-xs text-neutral-400">No platform data available.</p>
      </div>
    );
  }

  const width = 300;
  const height = 240;
  const padding = 35;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxSpend = Math.max(...platformComparison.map((p) => p.spend), 100);
  const barGroupWidth = graphWidth / platformComparison.length;
  const barWidth = Math.min(32, barGroupWidth * 0.5);

  return (
    <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-xs relative">
      <div className="mb-4">
        <h3 className="text-base font-bold text-neutral-900">Platform Breakdown</h3>
        <p className="text-xs text-neutral-500">Spend comparison across connected ad networks</p>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = height - padding - ratio * graphHeight;
            return (
              <line
                key={idx}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#F3F4F6"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Bars */}
          {platformComparison.map((p, i) => {
            const groupX = padding + i * barGroupWidth;
            const barX = groupX + (barGroupWidth - barWidth) / 2;
            const barH = (p.spend / maxSpend) * graphHeight;
            const barY = height - padding - barH;
            const color = PLATFORM_COLORS[p.platform] || '#4F46E5';

            return (
              <g
                key={p.platform}
                className="cursor-pointer transition-opacity hover:opacity-85"
                onMouseEnter={() => setHoveredPlatform(p)}
                onMouseLeave={() => setHoveredPlatform(null)}
              >
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(4, barH)}
                  rx="4"
                  ry="4"
                  fill={color}
                />
                <text
                  x={groupX + barGroupWidth / 2}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#6B7280"
                >
                  {p.platform}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPlatform && (
          <div className="absolute top-2 right-4 rounded-md border border-neutral-200 bg-surface/95 px-3 py-1.5 shadow-md backdrop-blur-xs text-xs">
            <div className="font-semibold text-neutral-800">
              {PLATFORM_LABELS[hoveredPlatform.platform] || hoveredPlatform.platform}
            </div>
            <div className="text-neutral-600">Spend: ${hoveredPlatform.spend.toLocaleString()}</div>
            <div className="text-emerald-600 font-semibold">ROAS: {hoveredPlatform.roas}x</div>
            <div className="text-neutral-400 text-[10px]">Share: {hoveredPlatform.shareOfSpend}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
