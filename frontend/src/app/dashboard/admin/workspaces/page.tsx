'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import I18nProvider from '@/components/I18nProvider';

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

function AdminWorkspacesContent() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check sessionStorage cache for instant rendering
    const cachedData = sessionStorage.getItem('adsync_admin_stats');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setWorkspaces(parsed.workspaces);
        setLoading(false);
      } catch {
        // ignore parse error
      }
    }

    const fetchWorkspaces = async () => {
      try {
        const token = localStorage.getItem('adsync_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        const res = await fetch(`${apiUrl}/api/workspaces/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load workspaces list.');

        const data = await res.json();
        setWorkspaces(data.workspaces);
        sessionStorage.setItem('adsync_admin_stats', JSON.stringify(data));
      } catch (err: any) {
        if (!cachedData) {
          setError(err.message || 'Error loading workspaces');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  if (user?.email !== 'admin@adsync.com') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-error">Access Denied</h1>
        <p className="mt-2 text-sm text-neutral-600">Super Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error uppercase">
          Tenant Workspaces Directory
        </span>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">Tenant Workspaces & Multi-Tenant Isolation</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Full directory of all registered SaaS customer workspaces, owner credentials, and active campaign counts.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Workspace Name</th>
                  <th className="px-4 py-3">Owner Name</th>
                  <th className="px-4 py-3">Owner Email</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Campaigns</th>
                  <th className="px-4 py-3">Ad Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {workspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-900">{ws.name}</td>
                    <td className="px-4 py-3 font-medium text-neutral-800">{ws.owner.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{ws.owner.email}</td>
                    <td className="px-4 py-3 font-bold text-primary">{ws.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ws.subscriptionStatus === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {ws.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-700">{ws._count.members}</td>
                    <td className="px-4 py-3 font-medium text-neutral-700">{ws._count.campaigns}</td>
                    <td className="px-4 py-3 font-medium text-neutral-700">{ws._count.adAccountConnections} connected</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminWorkspacesPage() {
  return (
    <I18nProvider>
      <AdminWorkspacesContent />
    </I18nProvider>
  );
}
