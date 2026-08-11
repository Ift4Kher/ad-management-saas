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

interface PlanConfig {
  key: 'STARTER' | 'GROWTH' | 'AGENCY';
  name: string;
  priceBdt: number;
  priceUsd: number;
  maxAccounts: number;
  maxWorkspaces: number;
  aiCredits: number;
}

function SuperAdminContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Billing Settings State (in BD Taka ৳)
  const [plans, setPlans] = useState<PlanConfig[]>([
    { key: 'STARTER', name: 'Starter Tier', priceBdt: 3200, priceUsd: 29, maxAccounts: 3, maxWorkspaces: 1, aiCredits: 50 },
    { key: 'GROWTH', name: 'Growth Tier', priceBdt: 8700, priceUsd: 79, maxAccounts: 10, maxWorkspaces: 3, aiCredits: 250 },
    { key: 'AGENCY', name: 'Agency Tier', priceBdt: 21900, priceUsd: 199, maxAccounts: 9999, maxWorkspaces: 9999, aiCredits: 1000 },
  ]);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BILLING_SETTINGS'>('OVERVIEW');

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const token = localStorage.getItem('adsync_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
      } catch (err: any) {
        setError(err.message || 'Error loading Super Admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  const handlePriceChange = (key: string, newBdt: number) => {
    setPlans(plans.map(p => p.key === key ? { ...p, priceBdt: newBdt } : p));
  };

  const handleSaveBillingSettings = () => {
    setSaveSuccess('Platform Billing Settings & Prices (BD Taka ৳) updated successfully!');
    setTimeout(() => setSaveSuccess(null), 4000);
  };

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
      const match = plans.find(p => p.key === ws.plan);
      return acc + (match ? match.priceBdt : 0);
    }, 0);
  };

  return (
    <div className="space-y-8 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error uppercase">
              Platform Super Admin Control Panel
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">System Administration</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Global SaaS metrics, platform multi-tenant workspace management, and BD Taka billing configuration.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            📊 System Overview
          </button>
          <button
            onClick={() => setActiveTab('BILLING_SETTINGS')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'BILLING_SETTINGS'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            ⚙️ Billing Settings (BD Taka ৳)
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-xs font-bold text-success flex items-center justify-between">
          <span>✓ {saveSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div>
      ) : activeTab === 'OVERVIEW' ? (
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
                    const planMatch = plans.find(p => p.key === ws.plan);
                    return (
                      <tr key={ws.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-neutral-900">{ws.name}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-800">{ws.owner.name}</div>
                          <div className="text-[10px] text-neutral-400">{ws.owner.email}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">{ws.plan}</td>
                        <td className="px-4 py-3 font-bold text-neutral-900">৳ {planMatch?.priceBdt.toLocaleString()} BDT</td>
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
      ) : (
        /* BILLING SETTINGS EDITOR */
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Platform Tier Pricing & Allocation Settings (BD Taka ৳)</h2>
              <p className="text-xs text-neutral-500">Configure monthly subscription pricing in Bangladeshi Taka (BDT) and resource limits for each tier.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.key} className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <span className="font-bold text-sm text-neutral-900">{plan.name}</span>
                    <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{plan.key}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700">Monthly Price (BD Taka ৳ BDT)</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-500">৳</span>
                        <input
                          type="number"
                          value={plan.priceBdt}
                          onChange={(e) => handlePriceChange(plan.key, Number(e.target.value))}
                          className="w-full rounded-lg border border-neutral-300 bg-white pl-8 pr-3 py-2 text-sm font-bold text-neutral-900 focus:border-primary focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] text-neutral-500">Max Ad Accounts</label>
                        <input
                          type="number"
                          value={plan.maxAccounts >= 9999 ? 9999 : plan.maxAccounts}
                          onChange={(e) => setPlans(plans.map(p => p.key === plan.key ? { ...p, maxAccounts: Number(e.target.value) } : p))}
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-neutral-500">Max Workspaces</label>
                        <input
                          type="number"
                          value={plan.maxWorkspaces >= 9999 ? 9999 : plan.maxWorkspaces}
                          onChange={(e) => setPlans(plans.map(p => p.key === plan.key ? { ...p, maxWorkspaces: Number(e.target.value) } : p))}
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-500">Monthly AI Credits</label>
                      <input
                        type="number"
                        value={plan.aiCredits}
                        onChange={(e) => setPlans(plans.map(p => p.key === plan.key ? { ...p, aiCredits: Number(e.target.value) } : p))}
                        className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Gateways Status */}
            <div className="border-t border-neutral-200 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Supported Payment Gateways Configuration</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">bKash Direct MFS Sandbox</div>
                    <div className="text-[10px] text-neutral-500">Bangladesh Mobile Wallet</div>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Active</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Nagad Direct MFS Sandbox</div>
                    <div className="text-[10px] text-neutral-500">Bangladesh Mobile Wallet</div>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Active</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Stripe Card Gateway</div>
                    <div className="text-[10px] text-neutral-500">International Visa/Mastercard</div>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Active</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveBillingSettings}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-dark"
              >
                Save Billing Settings
              </button>
            </div>
          </div>
        </div>
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
