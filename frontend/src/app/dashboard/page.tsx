'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';

interface WorkspaceDetails {
  id: string;
  name: string;
  userRole: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  members: Array<{ userId: string; name: string; email: string; role: string; emailVerified: boolean }>;
  campaigns: Array<{ id: string; platform: string; objective: string; status: string; budget: number }>;
  adAccountConnections: Array<{ id: string; platform: string; status: string }>;
}

export default function DashboardPage() {
  const { user, activeWorkspace, authFetch } = useAuth();
  const { t } = useTranslation();

  const [details, setDetails] = useState<WorkspaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch active workspace details when active workspace changes
  useEffect(() => {
    if (user?.email === 'admin@adsync.com') {
      window.location.href = '/dashboard/admin';
      return;
    }

    if (user && activeWorkspace) {
      setDetailsLoading(true);
      setActionError(null);
      setActionSuccess(null);

      authFetch(`/api/workspaces/${activeWorkspace.id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load workspace data.');
          return res.json();
        })
        .then((data) => {
          setDetails(data.workspace);
        })
        .catch((err) => {
          setActionError(err.message);
        })
        .finally(() => setDetailsLoading(false));
    }
  }, [user, activeWorkspace]);

  return (
    <main className="mx-auto flex-1 w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      {activeWorkspace && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{activeWorkspace.name}</h1>
              <p className="text-xs text-neutral-500 mt-0.5">{t('dashboard.workspace_id')}: {activeWorkspace.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">{t('dashboard.your_role')}:</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {activeWorkspace.role}
              </span>
            </div>
          </div>

          {/* Alert Messages */}
          {actionError && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-3 text-xs text-error">
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-success/20 bg-success/10 p-3 text-xs text-success">
              {actionSuccess}
            </div>
          )}

          {/* Grid Layout */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Workspace Overview */}
            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 sm:p-6 shadow-xs">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {t('dashboard.workspace_summary')}
              </h3>
              <div className="mt-4 space-y-2 text-sm text-neutral-700">
                <div className="flex justify-between border-b border-neutral-100 pb-2">
                  <span>{t('dashboard.members')}:</span>
                  <span className="font-semibold">{details?.members.length || 0}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-100 pb-2">
                  <span>{t('dashboard.ad_connections')}:</span>
                  <span className="font-semibold">{details?.adAccountConnections.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('campaigns.title')}:</span>
                  <span className="font-semibold">{details?.campaigns.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Workspace Members */}
            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 sm:p-6 shadow-xs">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {t('dashboard.workspace_members')}
              </h3>
              <div className="mt-4 space-y-2">
                {details?.members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-900 truncate">{m.name}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{m.email}</div>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 shrink-0 ml-2">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Campaign List */}
          <div className="mt-6 sm:mt-8 rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {t('dashboard.workspace_campaigns')} ({details?.campaigns.length || 0})
            </h3>
            {detailsLoading ? (
              <div className="py-8 text-center text-xs text-neutral-400">{t('dashboard.loading_campaigns')}</div>
            ) : details?.campaigns && details.campaigns.length > 0 ? (
              <div className="mt-4 divide-y divide-neutral-100">
                {details.campaigns.map((c) => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 text-xs gap-1">
                    <div>
                      <span className="font-semibold text-neutral-900">{c.platform}</span> — {c.objective}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-neutral-700">${c.budget}</span>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                {t('dashboard.no_campaigns_yet')}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
