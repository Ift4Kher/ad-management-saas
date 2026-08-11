'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';

interface Connection {
  id: string;
  platform: 'GOOGLE' | 'META' | 'TIKTOK';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  connectedAt: string;
  tokenExpiresAt: string | null;
}

const PLATFORMS = [
  { id: 'GOOGLE', nameKey: 'connections.google_ads', logo: 'G', color: 'bg-blue-500' },
  { id: 'META', nameKey: 'connections.meta_ads', logo: 'M', color: 'bg-blue-600' },
  { id: 'TIKTOK', nameKey: 'connections.tiktok_ads', logo: 'T', color: 'bg-black' },
] as const;

export default function ConnectionsPage() {
  const { user, activeWorkspace, authFetch } = useAuth();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Check URL parameters for OAuth return status
  useEffect(() => {
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const errorMsg = searchParams.get('error');

    if (status === 'success' && platform) {
      setActionSuccess(`Successfully connected ${platform} Ads account.`);
    } else if (status === 'error' && errorMsg) {
      setActionError(`Failed to connect: ${decodeURIComponent(errorMsg)}`);
    }
  }, [searchParams]);

  // Fetch current workspace connections
  useEffect(() => {
    if (activeWorkspace) {
      fetchConnections();
    }
  }, [activeWorkspace]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/workspaces/${activeWorkspace?.id}/connections`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    try {
      setActionError(null);
      setActionSuccess(null);

      // Initiate OAuth flow by retrieving authorization URL
      const res = await authFetch(
        `/api/workspaces/${activeWorkspace?.id}/connections/${platform.toLowerCase()}/connect`,
        { method: 'POST' }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to initiate ${platform} connection.`);
      }

      // Redirect user to OAuth authorization URL
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error initiating connection.');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      setActionError(null);
      setActionSuccess(null);

      const res = await authFetch(
        `/api/workspaces/${activeWorkspace?.id}/connections/${connectionId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setActionSuccess('Connection disconnected successfully.');
        fetchConnections();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to disconnect.');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error disconnecting.');
    }
  };

  const isViewOnly = activeWorkspace?.role === 'VIEWER';

  return (
    <main className="mx-auto flex-1 w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">{t('connections.title')}</h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          {t('connections.subtitle')}
        </p>
      </div>

      {actionError && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-3 text-xs text-error">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-success/20 bg-success/10 p-3 text-xs text-success">
          {actionSuccess}
        </div>
      )}

      {isViewOnly && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
          <strong>View Only:</strong> You need Editor or Owner permissions to modify ad account connections.
        </div>
      )}

      {!user?.emailVerifiedAt && !isViewOnly && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
          <strong>Email Verification Required:</strong> You must verify your email address before connecting ad accounts.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connection = connections.find(
            (c) => c.platform === platform.id && c.status === 'CONNECTED'
          );

          return (
            <div
              key={platform.id}
              className="flex flex-col rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-white font-bold shrink-0 ${platform.color}`}
                >
                  {platform.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900 truncate">{t(platform.nameKey)}</h3>
                  {connection ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-success">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                      </span>
                      {t('connections.connected')}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] font-medium text-neutral-500">{t('connections.disconnected')}</div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                {connection ? (
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={isViewOnly || loading}
                    className="w-full rounded-[var(--radius-md)] border border-neutral-200 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {t('connections.disconnect')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={isViewOnly || !user?.emailVerifiedAt || loading}
                    className="bg-gradient-primary w-full rounded-[var(--radius-md)] py-2 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
                  >
                    {t('connections.connect')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
