'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Rule {
  id: string;
  name: string;
  metric: 'SPEND' | 'CPA' | 'ROAS';
  operator: 'GREATER_THAN' | 'LESS_THAN';
  threshold: string;
  action: 'NOTIFY' | 'PAUSE';
  enabled: boolean;
  lastTriggeredAt: string | null;
  campaign?: { id: string; name: string; platform: string } | null;
}

interface CampaignOption {
  id: string;
  name: string;
  platform: string;
}

export default function RulesPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<'SPEND' | 'CPA' | 'ROAS'>('SPEND');
  const [operator, setOperator] = useState<'GREATER_THAN' | 'LESS_THAN'>('GREATER_THAN');
  const [threshold, setThreshold] = useState('50');
  const [action, setAction] = useState<'NOTIFY' | 'PAUSE'>('PAUSE');
  const [campaignId, setCampaignId] = useState('');

  const fetchRulesAndCampaigns = async () => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      if (!workspaceId || !token) return;

      const [rulesRes, campsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/workspaces/${workspaceId}/rules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4000/api/workspaces/${workspaceId}/campaigns`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }

      if (campsRes.ok) {
        const data = await campsRes.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesAndCampaigns();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          metric,
          operator,
          threshold: parseFloat(threshold),
          action,
          campaignId: campaignId || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setName('');
        setThreshold('50');
        await fetchRulesAndCampaigns();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create rule');
      }
    } catch (err) {
      console.error('Error creating rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRulesAndCampaigns();
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/rules/evaluate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEvalResult(
          `Evaluated ${data.rulesEvaluated} rules. Triggered: ${data.triggeredCount}, Notifications/Actions created: ${data.notificationsCreated}.`,
        );
        await fetchRulesAndCampaigns();
      } else {
        const data = await res.json();
        alert(data.error || 'Evaluation failed.');
      }
    } catch (err) {
      console.error('Error evaluating rules:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('rules.title')}</h1>
          <p className="text-sm text-neutral-500">
            {t('rules.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleEvaluateNow}
            disabled={evaluating}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 shadow-xs transition-colors flex items-center gap-2"
          >
            {evaluating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Evaluating...
              </>
            ) : (
              '⚡ Evaluate Rules Now'
            )}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            + Create Rule
          </button>
        </div>
      </div>

      {evalResult && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-xs font-semibold text-primary">
          ✓ {evalResult}
        </div>
      )}

      {/* Rules Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-base font-semibold text-neutral-900">No automation rules configured</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Create rules to automatically alert or request campaign pauses based on spend, CPA, or ROAS thresholds.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rule Name</th>
                  <th className="px-6 py-4 font-semibold">Target Campaign</th>
                  <th className="px-6 py-4 font-semibold">Condition</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Last Triggered</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">{rule.name}</td>
                    <td className="px-6 py-4 text-neutral-600">
                      {rule.campaign ? `${rule.campaign.name} (${rule.campaign.platform})` : 'All Campaigns'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-800">
                      {rule.metric} {rule.operator === 'GREATER_THAN' ? '>' : '<'} ${Number(rule.threshold).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          rule.action === 'PAUSE' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {rule.action === 'PAUSE' ? 'Pause Campaign (Requires Confirmation)' : 'Send Alert'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500">
                      {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-xs text-error hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Automation Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-900">Create Automation Rule</h2>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pause if Spend exceeds $50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Target Campaign</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Campaigns in Workspace</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.platform})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as any)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="SPEND">Spend ($)</option>
                    <option value="CPA">CPA ($)</option>
                    <option value="ROAS">ROAS (x)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Operator</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="GREATER_THAN">Exceeds (&gt;)</option>
                    <option value="LESS_THAN">Drops Below (&lt;)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Threshold Value</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="PAUSE">Pause Campaign (Money-Affecting — Requires Confirmation)</option>
                  <option value="NOTIFY">Send Alert Notification Only</option>
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">
                  🔒 Safety Guardrail: Money-affecting actions (Pause) will create an action prompt requiring explicit user confirmation before applying.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
