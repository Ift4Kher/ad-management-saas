'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface BillingUsage {
  connectedAccounts: number;
  maxAccounts: number;
  userWorkspaces: number;
  maxWorkspaces: number;
  aiCreditsUsed: number;
  maxAiCredits: number;
}

interface PlanLimits {
  name: string;
  priceUsd: number;
  priceBdt: number;
  maxAccounts: number;
  maxWorkspaces: number;
  aiCredits: number;
}

interface BillingInfo {
  plan: 'STARTER' | 'GROWTH' | 'AGENCY';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
  limits: PlanLimits;
  usage: BillingUsage;
  periodEnd: string | null;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Upgrade Modal
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'GROWTH' | 'AGENCY'>('GROWTH');
  const [paymentRail, setPaymentRail] = useState<'STRIPE' | 'BKASH' | 'NAGAD'>('STRIPE');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mfsStep, setMfsStep] = useState<'SELECT' | 'OTP'>('SELECT');
  const [otp, setOtp] = useState('123456');
  const [pin, setPin] = useState('1234');
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  const fetchBilling = async () => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      if (!workspaceId || !token) return;

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBilling(data);
      }
    } catch (err) {
      console.error('Failed to fetch billing info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleStartCheckout = async (plan: 'STARTER' | 'GROWTH' | 'AGENCY') => {
    setSelectedPlan(plan);
    setMfsStep('SELECT');
    setShowPaymentModal(true);
  };

  const handleConfirmStripePayment = async () => {
    setProcessing(true);
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      // Initiate Stripe Session
      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/billing/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (res.ok) {
        // Simulate Webhook Payment Succeeded for Sandbox
        await fetch(`http://localhost:4000/api/webhooks/stripe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invoice.payment_succeeded',
            data: {
              object: {
                id: `sub_stripe_${Date.now()}`,
                customer: `cus_test_${Date.now()}`,
                metadata: { workspaceId, plan: selectedPlan },
              },
            },
          }),
        });

        setShowPaymentModal(false);
        await fetchBilling();
        alert(`Successfully upgraded to ${selectedPlan} Plan via Stripe Sandbox!`);
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartMfsCheckout = async () => {
    setProcessing(true);
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/billing/mfs/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: paymentRail, plan: selectedPlan }),
      });

      if (res.ok) {
        const data = await res.json();
        setActivePaymentId(data.paymentID);
        setMfsStep('OTP');
      }
    } catch (err) {
      console.error('MFS checkout error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleExecuteMfsPayment = async () => {
    setProcessing(true);
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/billing/mfs/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentID: activePaymentId,
          provider: paymentRail,
          plan: selectedPlan,
        }),
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setMfsStep('SELECT');
        await fetchBilling();
        alert(`Successfully completed ${paymentRail} payment for ${selectedPlan} Plan!`);
      }
    } catch (err) {
      console.error('MFS execution error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('billing.title')}</h1>
        <p className="text-sm text-neutral-500">
          {t('billing.subtitle')}
        </p>
      </div>

      {/* VISIBLE IN-APP FAILED PAYMENT STATE BANNER */}
      {billing?.status === 'PAST_DUE' && (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
            <strong className="font-bold">{t('billing.payment_failed_title')}</strong> {t('billing.payment_failed_message')}
            </div>
          </div>
          <button
            onClick={() => handleStartCheckout(billing.plan)}
            className="rounded-lg bg-error px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-error/90"
          >
            {t('billing.update_payment')}
          </button>
        </div>
      )}

      {/* Usage Metering Section */}
      {billing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-2">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t('billing.connected_accounts')}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">
                {billing.usage.connectedAccounts} / {billing.usage.maxAccounts >= 9999 ? '∞' : billing.usage.maxAccounts}
              </span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {Math.round((billing.usage.connectedAccounts / Math.max(1, billing.usage.maxAccounts)) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(100, (billing.usage.connectedAccounts / Math.max(1, billing.usage.maxAccounts)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-2">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t('billing.workspaces_limit')}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">
                {billing.usage.userWorkspaces} / {billing.usage.maxWorkspaces >= 9999 ? '∞' : billing.usage.maxWorkspaces}
              </span>
              <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">{t('billing.active')}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: `${Math.min(100, (billing.usage.userWorkspaces / Math.max(1, billing.usage.maxWorkspaces)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-2">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t('billing.ai_credits_used')}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">
                {billing.usage.aiCreditsUsed} / {billing.usage.maxAiCredits}
              </span>
              <span className="text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">{t('billing.this_period')}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-warning rounded-full"
                style={{ width: `${Math.min(100, (billing.usage.aiCreditsUsed / Math.max(1, billing.usage.maxAiCredits)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plan Tier Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-4">
        {[
          {
            key: 'STARTER',
            title: 'Starter',
            priceUsd: '$29',
            priceBdt: '৳3,200',
            accounts: '3 Ad Accounts',
            workspaces: '1 Workspace',
            aiCredits: '50 AI Copy Credits / mo',
          },
          {
            key: 'GROWTH',
            title: 'Growth',
            priceUsd: '$79',
            priceBdt: '৳8,700',
            accounts: '10 Ad Accounts',
            workspaces: '3 Workspaces',
            aiCredits: '250 AI Copy Credits / mo',
            popular: true,
          },
          {
            key: 'AGENCY',
            title: 'Agency',
            priceUsd: '$199',
            priceBdt: '৳21,900',
            accounts: 'Unlimited Accounts',
            workspaces: 'Unlimited Workspaces',
            aiCredits: '1,000 AI Copy Credits / mo',
          },
        ].map((plan) => {
          const isCurrent = billing?.plan === plan.key;
          return (
            <div
              key={plan.key}
              className={`rounded-2xl border bg-white p-6 shadow-sm flex flex-col justify-between relative transition-all ${
                plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-neutral-200'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-neutral-900">{plan.title}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
                      Current Plan
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-neutral-900">{plan.priceBdt} <span className="text-xs text-neutral-500 font-normal">BDT / month</span></div>
                  <div className="text-xs font-semibold text-neutral-500 mt-0.5">Approx. {plan.priceUsd} USD via Card / MFS (bKash/Nagad)</div>
                </div>

                <ul className="space-y-2 text-xs text-neutral-600 border-t border-neutral-100 pt-3">
                  <li className="flex items-center gap-2">✓ <strong>{plan.accounts}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{plan.workspaces}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{plan.aiCredits}</strong></li>
                  <li className="flex items-center gap-2">✓ Automated Rule Safety Guardrails</li>
                  <li className="flex items-center gap-2">✓ Cross-Platform Performance Analytics</li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  disabled={isCurrent}
                  onClick={() => handleStartCheckout(plan.key as any)}
                  className={`w-full rounded-xl py-2.5 text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark shadow-xs'
                  }`}
                >
                  {isCurrent ? 'Active Plan' : `Upgrade to ${plan.title}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dual Payment Modal (Stripe Card vs bKash/Nagad MFS Sandbox) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-neutral-900">
                Select Payment Rail ({selectedPlan} Plan)
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-neutral-400 hover:text-neutral-600 font-bold">
                ✕
              </button>
            </div>

            {mfsStep === 'SELECT' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700">Choose Payment Method</label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentRail('STRIPE')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        paymentRail === 'STRIPE' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-neutral-200'
                      }`}
                    >
                      <div className="text-xl">💳</div>
                      <div className="text-xs font-bold mt-1">Stripe</div>
                      <div className="text-[10px] text-neutral-400">Card (USD)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentRail('BKASH')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        paymentRail === 'BKASH' ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/20' : 'border-neutral-200'
                      }`}
                    >
                      <div className="text-xl">📱</div>
                      <div className="text-xs font-bold text-pink-600 mt-1">bKash</div>
                      <div className="text-[10px] text-neutral-400">MFS (BDT)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentRail('NAGAD')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        paymentRail === 'NAGAD' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20' : 'border-neutral-200'
                      }`}
                    >
                      <div className="text-xl">📱</div>
                      <div className="text-xs font-bold text-orange-600 mt-1">Nagad</div>
                      <div className="text-[10px] text-neutral-400">MFS (BDT)</div>
                    </button>
                  </div>
                </div>

                {/* Operational Architecture Difference Explanation Box */}
                <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 leading-relaxed space-y-1">
                  <div className="font-bold text-neutral-900">
                    ℹ️ How {paymentRail === 'STRIPE' ? 'Stripe Card Payment' : `${paymentRail} MFS Payment`} Works:
                  </div>
                  {paymentRail === 'STRIPE' ? (
                    <p>
                      <strong>Recurring Credit Card Rail:</strong> Automatically charges your card on a recurring monthly billing cycle. Webhooks handle subscription renewals and failed payment states asynchronously.
                    </p>
                  ) : (
                    <p>
                      <strong>Direct Mobile Wallet Rail:</strong> Operates as an explicit 2-step push transaction in Bangladesh. Enter mobile number, verify OTP & PIN to authorize payment for this billing cycle.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={paymentRail === 'STRIPE' ? handleConfirmStripePayment : handleStartMfsCheckout}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                  >
                    {processing ? 'Processing...' : `Proceed to Pay with ${paymentRail}`}
                  </button>
                </div>
              </div>
            ) : (
              /* MFS OTP Verification Step */
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 text-xs text-pink-700">
                  📲 <strong>{paymentRail} Sandbox Payment ID:</strong> <code className="font-mono">{activePaymentId}</code>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Sandbox OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono text-center tracking-widest text-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Sandbox Mobile Wallet PIN</label>
                  <input
                    type="password"
                    maxLength={5}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono text-center tracking-widest text-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setMfsStep('SELECT')}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleExecuteMfsPayment}
                    className="rounded-lg bg-success px-5 py-2 text-sm font-semibold text-white hover:bg-success-dark"
                  >
                    {processing ? 'Verifying...' : `Confirm & Authorize Payment`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
