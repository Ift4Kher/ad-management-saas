'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import I18nProvider from '@/components/I18nProvider';

interface SystemStats {
  totalUsers: number;
  totalWorkspaces: number;
  totalCampaigns: number;
  totalConnections: number;
  totalAiTokensUsed: number;
}

interface WorkspaceOverview {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  owner: {
    name: string;
    email: string;
  };
  _count: {
    members: number;
    campaigns: number;
    adAccountConnections: number;
  };
}

const PLAN_PRICES_BDT: Record<string, number> = {
  STARTER: 3200,
  GROWTH: 8700,
  AGENCY: 21900,
};

function SuperAdminContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check sessionStorage cache for instant FCP (< 1ms)
    const cachedData = sessionStorage.getItem('adsync_admin_stats');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setStats(parsed.systemStats);
        setWorkspaces(parsed.workspaces);
        setLoading(false);
      } catch {
        // ignore JSON parse error
      }
    }

    const fetchAdminStats = async () => {
      try {
        const token = localStorage.getItem('adsync_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        const res = await fetch(`${apiUrl}/api/workspaces/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load Super Admin stats.');
        }

        const data = await res.json();
        setStats(data.systemStats);
        setWorkspaces(data.workspaces);
        sessionStorage.setItem('adsync_admin_stats', JSON.stringify(data));
      } catch (err: any) {
        if (!cachedData) {
          setError(err.message || 'Error loading Super Admin dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  if (user?.email !== 'admin@adsync.com') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-error">Access Denied</h1>
        <p className="mt-2 text-sm text-neutral-600">You must be logged in as Super Admin (admin@adsync.com) to view this page.</p>
      </div>
    );
  }

  // Calculate System Revenue in BDT
  const calculateTotalBdtMrr = () => {
    return workspaces.reduce((acc, ws) => {
      const price = PLAN_PRICES_BDT[ws.plan] || 0;
      return acc + price;
    }, 0);
  };

  return (
    <div className="space-y-8 p-6 sm:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error uppercase">
            Platform Super Admin Control Panel
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">System Administration Overview</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Global SaaS metrics, platform multi-tenant workspace management, and BD Taka revenue overview.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div>
      ) : (
        <>
          {/* System KPIs Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total SaaS Workspaces</div>
              <div className="mt-2 text-3xl font-extrabold text-neutral-900">{stats?.totalWorkspaces}</div>
              <div className="mt-1 text-[11px] text-neutral-400">Across all tenant accounts</div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Registered Users</div>
              <div className="mt-2 text-3xl font-extrabold text-neutral-900">{stats?.totalUsers}</div>
              <div className="mt-1 text-[11px] text-neutral-400">Platform-wide members</div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Estimated Monthly MRR</div>
              <div className="mt-2 text-3xl font-extrabold text-success">৳ {calculateTotalBdtMrr().toLocaleString()}</div>
              <div className="mt-1 text-[11px] text-neutral-400">BD Taka (BDT) Monthly Revenue</div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Campaigns</div>
              <div className="mt-2 text-3xl font-extrabold text-primary">{stats?.totalCampaigns}</div>
              <div className="mt-1 text-[11px] text-neutral-400">Created across all workspaces</div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 shadow-xs">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">AI Tokens Consumed</div>
              <div className="mt-2 text-3xl font-extrabold text-secondary">{stats?.totalAiTokensUsed.toLocaleString()}</div>
              <div className="mt-1 text-[11px] text-neutral-400">Metered AI copy generations</div>
            </div>
          </div>

          {/* Tenant Workspaces List */}
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900">Tenant Workspaces Directory</h2>
            <p className="text-xs text-neutral-500 mb-4">Complete list of registered SaaS tenant workspaces and usage metrics.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Workspace Name</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Plan Tier</th>
                    <th className="px-4 py-3">Monthly Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3">Campaigns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {workspaces.map((ws) => {
                    const price = PLAN_PRICES_BDT[ws.plan] || 0;
                    return (
                      <tr key={ws.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-neutral-900">{ws.name}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-800">{ws.owner.name}</div>
                          <div className="text-[10px] text-neutral-400">{ws.owner.email}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">{ws.plan}</td>
                        <td className="px-4 py-3 font-bold text-neutral-900">৳ {price.toLocaleString()} BDT</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            ws.subscriptionStatus === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                          }`}>
                            {ws.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-700">{ws._count.members}</td>
                        <td className="px-4 py-3 font-medium text-neutral-700">{ws._count.campaigns}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <I18nProvider>
      <SuperAdminContent />
    </I18nProvider>
  );
}
