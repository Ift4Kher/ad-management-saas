'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AiCopyGeneratorModal from '@/components/AiCopyGeneratorModal';

interface CreativeAsset {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'CAROUSEL';
  url: string;
  content: string | null;
  aiGenerated: boolean;
  complianceCheckedAt: string | null;
  createdAt: string;
}

export default function CreativesPage() {
  const { t } = useTranslation();
  const [creatives, setCreatives] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  // New Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'IMAGE' | 'TEXT' | 'VIDEO'>('TEXT');
  const [url, setUrl] = useState('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800');
  const [content, setContent] = useState('');

  const fetchCreatives = async () => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      if (!workspaceId || !token) return;

      const url =
        filterType === 'ALL'
          ? `http://localhost:4000/api/workspaces/${workspaceId}/creatives`
          : `http://localhost:4000/api/workspaces/${workspaceId}/creatives?type=${filterType}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCreatives(data.creatives || []);
      }
    } catch (err) {
      console.error('Error fetching creative assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, [filterType]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      const res = await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/creatives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
          url,
          content: type === 'TEXT' ? content : undefined,
          aiGenerated: false,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setContent('');
        await fetchCreatives();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create asset.');
      }
    } catch (err) {
      console.error('Error creating asset:', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');
      await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/creatives/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCreatives();
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

  const handleSaveAiCopyAsAsset = async (headline: string, description: string) => {
    try {
      const workspaceId = localStorage.getItem('adsync_workspace_id');
      const token = localStorage.getItem('adsync_token');

      await fetch(`http://localhost:4000/api/workspaces/${workspaceId}/creatives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: headline,
          type: 'TEXT',
          url: 'https://adsync.internal/assets/text-copy',
          content: `${headline}\n${description}`,
          aiGenerated: true,
        }),
      });

      await fetchCreatives();
    } catch (err) {
      console.error('Error saving AI asset:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('creatives.title')}</h1>
          <p className="text-sm text-neutral-500">
            {t('creatives.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
          >
            {t('creatives.ai_generate')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            + {t('creatives.upload_asset')}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
        {['ALL', 'TEXT', 'IMAGE', 'VIDEO'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterType === type ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Loading creative assets...</div>
        ) : creatives.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <h3 className="text-base font-semibold text-neutral-900">No creative assets found</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Upload images or use our AI Ad Copy Generator to build a library of reusable campaign assets.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowAiModal(true)}
                className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
              >
                ✨ AI Copy Generator
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Add Asset
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatives.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-neutral-900 line-clamp-1">{asset.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        asset.type === 'TEXT'
                          ? 'bg-primary/10 text-primary'
                          : asset.type === 'IMAGE'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {asset.type}
                    </span>
                  </div>

                  {asset.aiGenerated && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/20">
                      <span>✨ AI Generated</span>
                    </div>
                  )}

                  {asset.type === 'TEXT' ? (
                    <p className="text-xs text-neutral-600 bg-white p-3 rounded-lg border border-neutral-200 font-mono whitespace-pre-wrap line-clamp-4">
                      {asset.content || asset.url}
                    </p>
                  ) : (
                    <div className="h-36 w-full rounded-lg bg-neutral-200 overflow-hidden relative">
                      <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Added {new Date(asset.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="text-error hover:underline font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add Asset */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-900">Add Creative Asset</h2>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Promo Headline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Asset Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="TEXT">Text Copy</option>
                  <option value="IMAGE">Image URL</option>
                  <option value="VIDEO">Video URL</option>
                </select>
              </div>

              {type === 'TEXT' ? (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Ad Copy Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter headline and body text..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Media URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Copy Generator Modal */}
      <AiCopyGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSelectCopy={handleSaveAiCopyAsAsset}
      />
    </div>
  );
}
