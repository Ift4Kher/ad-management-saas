'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignWizardData } from '@/app/dashboard/campaigns/new/page';

interface Props {
  formData: CampaignWizardData;
  updateFormData: (updates: Partial<CampaignWizardData>) => void;
  onNext: () => void;
}

export default function StepObjective({ formData, updateFormData, onNext }: Props) {
  const { t } = useTranslation();

  const platforms = [
    { id: 'GOOGLE', name: 'Google Ads', icon: '🔍', desc: 'Reach users searching for your products' },
    { id: 'META', name: 'Meta Ads', icon: '📱', desc: 'Facebook & Instagram audiences' },
    { id: 'TIKTOK', name: 'TikTok Ads', icon: '🎵', desc: 'Engage with short-form video' },
  ];

  const objectives = [
    { id: 'LEADS', name: 'Generate Leads', desc: 'Collect contact information from interested prospects' },
    { id: 'SALES', name: 'Drive Sales', desc: 'Maximize purchases on your website or app' },
    { id: 'TRAFFIC', name: 'Website Traffic', desc: 'Get more people to visit your website' },
    { id: 'AWARENESS', name: 'Brand Awareness', desc: 'Reach the maximum number of people' },
  ];

  const isValid = formData.name.trim() !== '' && formData.platform !== '' && formData.objective !== '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">{t('wizard.step1.title', 'Campaign Basics')}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t('wizard.step1.subtitle', 'Name your campaign and choose where and how you want to advertise.')}
        </p>
      </div>

      {/* Campaign Name */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-neutral-700">
          {t('wizard.step1.nameLabel', 'Campaign Name')}
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder={t('wizard.step1.namePlaceholder', 'e.g. Summer Sale 2024')}
          className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Platform Selection */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-neutral-700">
          {t('wizard.step1.platformLabel', 'Select Platform')}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => updateFormData({ platform: p.id as any })}
              className={`flex flex-col items-start rounded-[var(--radius-lg)] border-2 p-4 text-left transition-all ${
                formData.platform === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 bg-surface hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <span className="mb-2 text-2xl">{p.icon}</span>
              <span className={`font-bold ${formData.platform === p.id ? 'text-primary' : 'text-neutral-900'}`}>
                {p.name}
              </span>
              <span className="mt-1 text-[11px] text-neutral-500">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Objective Selection */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-neutral-700">
          {t('wizard.step1.objectiveLabel', 'Campaign Objective')}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {objectives.map((obj) => (
            <button
              key={obj.id}
              onClick={() => updateFormData({ objective: obj.id })}
              className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-left transition-all ${
                formData.objective === obj.id
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 bg-surface hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <div className={`font-bold ${formData.objective === obj.id ? 'text-primary' : 'text-neutral-900'}`}>
                {obj.name}
              </div>
              <div className="mt-1 text-xs text-neutral-500">{obj.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="bg-gradient-primary rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:shadow-md disabled:opacity-50"
        >
          {t('wizard.next', 'Next Step')} →
        </button>
      </div>
    </div>
  );
}
