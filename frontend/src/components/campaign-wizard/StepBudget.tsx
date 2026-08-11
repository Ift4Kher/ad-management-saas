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

export default function StepBudget({ formData, updateFormData, onNext, onBack }: Props) {
  const { t } = useTranslation();

  const presets = ['100', '500', '1000', '5000'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">{t('wizard.step3.title', 'Budget & Schedule')}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t('wizard.step3.subtitle', 'Set your campaign budget.')}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-neutral-700">
          {t('wizard.step3.budgetLabel', 'Daily Budget ($)')}
        </label>
        
        <div className="flex flex-wrap gap-3 mb-4">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => updateFormData({ budget: preset })}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                formData.budget === preset
                  ? 'border-primary bg-primary text-white shadow-xs'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500">
            $
          </div>
          <input
            type="number"
            min="1"
            value={formData.budget}
            onChange={(e) => updateFormData({ budget: e.target.value })}
            className="w-full rounded-[var(--radius-md)] border border-neutral-300 py-3 pl-8 pr-4 text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          {t('wizard.step3.budgetHelp', 'You will not be charged until the campaign goes live.')}
        </p>
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
          disabled={!formData.budget || Number(formData.budget) <= 0}
          className="bg-gradient-primary rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:shadow-md disabled:opacity-50"
        >
          {t('wizard.next', 'Next Step')} →
        </button>
      </div>
    </div>
  );
}
