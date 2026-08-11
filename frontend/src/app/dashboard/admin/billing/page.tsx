'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import I18nProvider from '@/components/I18nProvider';

interface PlanConfig {
  key: 'STARTER' | 'GROWTH' | 'AGENCY';
  name: string;
  priceBdt: number;
  priceUsd: number;
  maxAccounts: number;
  maxWorkspaces: number;
  aiCredits: number;
}

function AdminBillingContent() {
  const { user } = useAuth();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [plans, setPlans] = useState<PlanConfig[]>([
    { key: 'STARTER', name: 'Starter Tier', priceBdt: 3200, priceUsd: 29, maxAccounts: 3, maxWorkspaces: 1, aiCredits: 50 },
    { key: 'GROWTH', name: 'Growth Tier', priceBdt: 8700, priceUsd: 79, maxAccounts: 10, maxWorkspaces: 3, aiCredits: 250 },
    { key: 'AGENCY', name: 'Agency Tier', priceBdt: 21900, priceUsd: 199, maxAccounts: 9999, maxWorkspaces: 9999, aiCredits: 1000 },
  ]);

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
        <p className="mt-2 text-sm text-neutral-600">Super Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error uppercase">
          Platform Billing Control Panel
        </span>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">Billing & Pricing Settings (BD Taka ৳)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure SaaS subscription tier prices in Bangladeshi Taka (BDT), monthly AI credits, and payment gateways.
        </p>
      </div>

      {saveSuccess && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-xs font-bold text-success flex items-center justify-between">
          <span>✓ {saveSuccess}</span>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Platform Tier Pricing (BD Taka ৳ BDT)</h2>
          <p className="text-xs text-neutral-500">Set price points and resource limits for Starter, Growth, and Agency subscription tiers.</p>
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

        {/* Payment Gateways */}
        <div className="border-t border-neutral-200 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900">Active SaaS Payment Gateways</h3>

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
  );
}

export default function AdminBillingPage() {
  return (
    <I18nProvider>
      <AdminBillingContent />
    </I18nProvider>
  );
}
