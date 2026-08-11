'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignWizardData } from '@/app/dashboard/campaigns/new/page';

interface Props {
  formData: CampaignWizardData;
  updateFormData: (updates: Partial<CampaignWizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepAudience({ formData, updateFormData, onNext, onBack }: Props) {
  const { t } = useTranslation();

  const handleLocationAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      updateFormData({
        audience: {
          ...formData.audience,
          locations: [...formData.audience.locations, e.currentTarget.value],
        },
      });
      e.currentTarget.value = '';
    }
  };

  const handleLocationRemove = (loc: string) => {
    updateFormData({
      audience: {
        ...formData.audience,
        locations: formData.audience.locations.filter((l) => l !== loc),
      },
    });
  };

  const handleInterestAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      updateFormData({
        audience: {
          ...formData.audience,
          interests: [...formData.audience.interests, e.currentTarget.value],
        },
      });
      e.currentTarget.value = '';
    }
  };

  const handleInterestRemove = (interest: string) => {
    updateFormData({
      audience: {
        ...formData.audience,
        interests: formData.audience.interests.filter((i) => i !== interest),
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">{t('wizard.step2.title', 'Target Audience')}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t('wizard.step2.subtitle', 'Define who should see your ads.')}
        </p>
      </div>

      {/* Locations */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-neutral-700">
          {t('wizard.step2.locationsLabel', 'Locations')}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.audience.locations.map((loc) => (
            <span key={loc} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {loc}
              <button type="button" onClick={() => handleLocationRemove(loc)} className="text-primary hover:text-primary-dark">
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          onKeyDown={handleLocationAdd}
          placeholder={t('wizard.step2.locationsPlaceholder', 'Type a location and press Enter')}
          className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Interests */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-neutral-700">
          {t('wizard.step2.interestsLabel', 'Interests')}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.audience.interests.map((interest) => (
            <span key={interest} className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
              {interest}
              <button type="button" onClick={() => handleInterestRemove(interest)} className="text-secondary hover:text-secondary-dark">
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          onKeyDown={handleInterestAdd}
          placeholder={t('wizard.step2.interestsPlaceholder', 'Type an interest and press Enter')}
          className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="rounded-[var(--radius-md)] border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 shadow-xs transition-all hover:bg-neutral-50"
        >
          ← {t('wizard.back', 'Back')}
        </button>
        <button
          onClick={onNext}
          className="bg-gradient-primary rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:shadow-md"
        >
          {t('wizard.next', 'Next Step')} →
        </button>
      </div>
    </div>
  );
}
