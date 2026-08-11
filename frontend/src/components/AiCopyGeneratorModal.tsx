'use client';

import React, { useState } from 'react';

export interface CopyVariant {
  id: string;
  headline: string;
  description: string;
  compliant: boolean;
  policyViolations: string[];
}

interface AiCopyGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCopy: (headline: string, description: string) => void;
}

export default function AiCopyGeneratorModal({
  isOpen,
  onClose,
  onSelectCopy,
}: AiCopyGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<CopyVariant[]>([]);
  const [usageLogId, setUsageLogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setVariants([]);

    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/ai/generate-copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, targetAudience }),
      });

      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants || []);
        setUsageLogId(data.usageLogId || null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate copy variants.');
      }
    } catch (err) {
      console.error('Error generating AI copy:', err);
      setError('Network error generating AI copy.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = async (variant: CopyVariant) => {
    if (!variant.compliant) return;

    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      if (usageLogId) {
        await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/ai/log-selection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            usageLogId,
            selectedVariant: variant,
          }),
        });
      }

      onSelectCopy(variant.headline, variant.description);
      onClose();
    } catch (err) {
      console.error('Error logging variant selection:', err);
      onSelectCopy(variant.headline, variant.description);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span>✨</span> AI Ad Copy Generator & Policy Compliance Guard
            </h2>
            <p className="text-xs text-neutral-500">
              Enter your product or service details to generate 3 headline + description variants with instant ad policy compliance checking.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 font-bold text-lg">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Product / Service Description <span className="text-error">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. AI-powered financial analytics platform for e-commerce stores that automates daily ad spend reporting..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              Tip: Include keywords like <code className="bg-neutral-100 px-1 py-0.5 rounded">"miracle cure"</code> to test policy compliance blocking!
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Target Audience (Optional)</label>
            <input
              type="text"
              placeholder="e.g. E-commerce Founders, Marketing Agencies"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Variants...
                </>
              ) : (
                '✨ Generate 3 Copy Variants'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-xs font-semibold text-error">
            ⚠️ {error}
          </div>
        )}

        {/* Variants List */}
        {variants.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Generated Copy Variants ({variants.length})
            </h3>

            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition-all ${
                    v.compliant
                      ? 'border-neutral-200 bg-white hover:border-primary/50 hover:shadow-xs'
                      : 'border-error/30 bg-error/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400">Variant #{idx + 1}</span>
                      {v.compliant ? (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success">
                          🟢 Policy Compliant
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-0.5 text-[11px] font-bold text-error">
                          🔴 Policy Violation (Blocked)
                        </span>
                      )}
                    </div>

                    <button
                      disabled={!v.compliant}
                      onClick={() => handleSelectVariant(v)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        v.compliant
                          ? 'bg-primary text-white hover:bg-primary-dark'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {v.compliant ? 'Use This Copy' : 'Selection Blocked'}
                    </button>
                  </div>

                  {/* Headline & Description */}
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-neutral-900">{v.headline}</div>
                    <p className="text-xs text-neutral-600 leading-relaxed">{v.description}</p>
                  </div>

                  {/* Policy Violation Explanation Box */}
                  {!v.compliant && (
                    <div className="mt-3 p-3 rounded-lg border border-error/20 bg-error/10 text-xs text-error space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Ad Platform Compliance Violation Reasons:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 font-medium pl-1">
                        {v.policyViolations.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
