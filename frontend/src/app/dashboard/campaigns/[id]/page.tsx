'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';

import BudgetPacingBar from '@/components/BudgetPacingBar';

interface PublishAttempt {
  id: string;
  platform: string;
  status: 'PENDING' | 'PUBLISHING' | 'SUCCESS' | 'FAILED';
  externalId: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  attemptNumber: number;
  createdAt: string;
}

interface CampaignDetail {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  budget: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const platformMeta: Record<string, { icon: string; name: string }> = {
  GOOGLE: { icon: '🔍', name: 'Google Ads' },
  META: { icon: '📱', name: 'Meta Ads' },
  TIKTOK: { icon: '🎵', name: 'TikTok Ads' },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeWorkspace, authFetch } = useAuth();
  const { t } = useTranslation();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [attempts, setAttempts] = useState<PublishAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const res = await authFetch(`/api/workspaces/${activeWorkspace.id}/campaigns/${campaignId}`);
      if (!res.ok) throw new Error('Failed to load campaign.');
      const data = await res.json();
      setCampaign(data.campaign);
      setAttempts(data.publishAttempts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading campaign.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, campaignId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Auto-poll while any attempt is PENDING or PUBLISHING
  useEffect(() => {
    const hasPending = attempts.some((a) => a.status === 'PENDING' || a.status === 'PUBLISHING');
    if (!hasPending) return;

    const interval = setInterval(fetchDetail, 2000);
    return () => clearInterval(interval);
  }, [attempts, fetchDetail]);

  const handlePublish = async () => {
    if (!activeWorkspace || !campaign) return;
    setPublishing(true);
    setError(null);

    try {
      const res = await authFetch(`/api/workspaces/${activeWorkspace.id}/campaigns/${campaignId}/publish`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish.');
      }
      // Immediately refetch to show PENDING state
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error publishing campaign.');
    } finally {
      setPublishing(false);
    }
  };

  const handleRetry = async (platform: string) => {
    if (!activeWorkspace) return;
    setRetrying(platform);
    setError(null);

    try {
      const res = await authFetch(
        `/api/workspaces/${activeWorkspace.id}/campaigns/${campaignId}/retry/${platform}`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to retry.');
      }
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error retrying publish.');
    } finally {
      setRetrying(null);
    }
  };

  if (!activeWorkspace) return null;

  if (loading) {
    return (
      <main className="mx-auto flex-1 w-full max-w-4xl px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-neutral-200" />
          <div className="h-4 w-96 rounded bg-neutral-100" />
          <div className="mt-8 h-48 rounded-xl bg-neutral-100" />
        </div>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="mx-auto flex-1 w-full max-w-4xl px-6 py-8">
        <p className="text-sm text-error">Campaign not found.</p>
      </main>
    );
  }

  const pm = platformMeta[campaign.platform] || { icon: '📢', name: campaign.platform };

  return (
    <main className="mx-auto flex-1 w-full max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/dashboard/campaigns')}
            className="mb-2 text-xs text-neutral-500 hover:text-primary transition-colors"
          >
            ← {t('publishing.backToList', 'Back to Campaigns')}
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">{campaign.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
            <span>{pm.icon} {pm.name}</span>
            <span>·</span>
            <span>{campaign.objective}</span>
            <span>·</span>
            <span className="font-medium text-neutral-900">${campaign.budget}/day</span>
          </div>

          <div className="mt-4 max-w-xs">
            <BudgetPacingBar spent={Math.round(Number(campaign.budget) * 0.72)} budget={Number(campaign.budget)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
            campaign.status === 'ACTIVE' ? 'bg-success/10 text-success' :
            campaign.status === 'PUBLISHING' ? 'bg-primary/10 text-primary' :
            campaign.status === 'PAUSED' ? 'bg-warning/10 text-warning' :
            'bg-neutral-100 text-neutral-600'
          }`}>
            {campaign.status === 'PUBLISHING' && (
              <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {campaign.status}
          </span>

          {campaign.status === 'DRAFT' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-gradient-primary rounded-[var(--radius-md)] px-5 py-2 text-sm font-bold text-white shadow-xs hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('publishing.publishing', 'Publishing...')}
                </>
              ) : (
                t('publishing.publish', 'Publish Campaign 🚀')
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* Per-Platform Status Cards */}
      {attempts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            {t('publishing.platformStatus', 'Platform Publishing Status')}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attempts.map((attempt) => {
              const apm = platformMeta[attempt.platform] || { icon: '📢', name: attempt.platform };

              return (
                <div
                  key={attempt.id}
                  className={`rounded-[var(--radius-lg)] border-2 p-5 transition-all ${
                    attempt.status === 'SUCCESS' ? 'border-success/30 bg-success/5' :
                    attempt.status === 'FAILED' ? 'border-error/30 bg-error/5' :
                    attempt.status === 'PUBLISHING' ? 'border-primary/30 bg-primary/5' :
                    'border-neutral-200 bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{apm.icon}</span>
                      <span className="font-bold text-neutral-900">{apm.name}</span>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      attempt.status === 'SUCCESS' ? 'bg-success/20 text-success' :
                      attempt.status === 'FAILED' ? 'bg-error/20 text-error' :
                      attempt.status === 'PUBLISHING' ? 'bg-primary/20 text-primary' :
                      'bg-neutral-200 text-neutral-600'
                    }`}>
                      {(attempt.status === 'PENDING' || attempt.status === 'PUBLISHING') && (
                        <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {attempt.status === 'SUCCESS' && '✓ '}
                      {attempt.status === 'FAILED' && '✗ '}
                      {attempt.status}
                    </span>
                  </div>

                  {/* Success Details */}
                  {attempt.status === 'SUCCESS' && attempt.externalId && (
                    <div className="text-xs text-success">
                      <span className="text-neutral-500">External ID:</span>{' '}
                      <span className="font-mono">{attempt.externalId}</span>
                    </div>
                  )}

                  {/* Failure Details */}
                  {attempt.status === 'FAILED' && (
                    <div className="space-y-2">
                      <p className="text-xs text-error">{attempt.errorMessage}</p>
                      {attempt.errorCode && (
                        <p className="text-[10px] text-neutral-500 font-mono">Code: {attempt.errorCode}</p>
                      )}
                      <button
                        onClick={() => handleRetry(attempt.platform)}
                        disabled={retrying === attempt.platform}
                        className="mt-2 w-full rounded-[var(--radius-md)] border border-error/30 bg-white px-3 py-1.5 text-xs font-bold text-error hover:bg-error/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {retrying === attempt.platform ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {t('publishing.retrying', 'Retrying...')}
                          </>
                        ) : (
                          <>🔄 {t('publishing.retry', 'Retry')} {apm.name}</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Attempt Counter */}
                  <div className="mt-2 text-[10px] text-neutral-400">
                    Attempt #{attempt.attemptNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Campaign Summary */}
      {attempts.length === 0 && campaign.status === 'DRAFT' && (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl">🚀</span>
          </div>
          <h3 className="text-sm font-bold text-neutral-900">
            {t('publishing.readyTitle', 'Ready to Publish')}
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            {t('publishing.readySubtitle', 'Click the Publish button above to send this campaign to')} {pm.name}.
          </p>
        </div>
      )}
    </main>
  );
}
