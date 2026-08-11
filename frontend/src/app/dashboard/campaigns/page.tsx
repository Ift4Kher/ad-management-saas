'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  budget: number;
}

export default function CampaignsPage() {
  const { activeWorkspace, authFetch } = useAuth();
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      setLoading(true);
      setError(null);
      authFetch(`/api/workspaces/${activeWorkspace.id}/campaigns`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load campaigns.');
          return res.json();
        })
        .then((data) => {
          setCampaigns(data.campaigns);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [activeWorkspace]);

  if (!activeWorkspace) return null;

  return (
    <main className="mx-auto flex-1 w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">{t('campaigns.title', 'Campaigns')}</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            {t('campaigns.subtitle', 'Manage and track your active advertising campaigns.')}
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-gradient-primary rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:shadow-md transition-shadow self-start sm:self-auto"
        >
          + {t('campaigns.createButton', 'Create Campaign')}
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-500">
            {t('campaigns.loading', 'Loading campaigns...')}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="m3 15 2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">{t('campaigns.emptyTitle', 'No campaigns yet')}</h3>
            <p className="mt-1 text-sm text-neutral-500">
              {t('campaigns.emptySubtitle', 'Get started by creating your first campaign.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t('campaigns.tableName', 'Campaign Name')}</th>
                  <th className="px-6 py-4 font-semibold">{t('campaigns.tablePlatform', 'Platform')}</th>
                  <th className="px-6 py-4 font-semibold">{t('campaigns.tableObjective', 'Objective')}</th>
                  <th className="px-6 py-4 font-semibold">{t('campaigns.tableBudget', 'Budget')}</th>
                  <th className="px-6 py-4 font-semibold">{t('campaigns.tableStatus', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      <Link href={`/dashboard/campaigns/${campaign.id}`} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{campaign.platform}</td>
                    <td className="px-6 py-4 text-neutral-600">{campaign.objective}</td>
                    <td className="px-6 py-4 text-neutral-900 font-medium">${campaign.budget}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        campaign.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                        campaign.status === 'PUBLISHING' ? 'bg-primary/10 text-primary' :
                        campaign.status === 'PAUSED' ? 'bg-warning/10 text-warning' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {campaign.status === 'PUBLISHING' && (
                          <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
