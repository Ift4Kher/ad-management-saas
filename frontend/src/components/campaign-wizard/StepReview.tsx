'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignWizardData } from '@/app/dashboard/campaigns/new/page';

interface Props {
  formData: CampaignWizardData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function StepReview({ formData, onBack, onSubmit, isSubmitting }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">{t('wizard.step5.title', 'Review & Launch')}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t('wizard.step5.subtitle', 'Double-check your campaign details before launching.')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Summary Card */}
        <div className="space-y-6 rounded-[var(--radius-lg)] bg-neutral-50 p-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Campaign Details</h3>
            <p className="text-sm font-medium text-neutral-900"><span className="text-neutral-500">Name:</span> {formData.name}</p>
            <p className="text-sm font-medium text-neutral-900"><span className="text-neutral-500">Platform:</span> {formData.platform}</p>
            <p className="text-sm font-medium text-neutral-900"><span className="text-neutral-500">Objective:</span> {formData.objective}</p>
            <p className="text-sm font-medium text-neutral-900"><span className="text-neutral-500">Budget:</span> ${formData.budget} / day</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Audience</h3>
            <p className="text-sm font-medium text-neutral-900">
              <span className="text-neutral-500">Locations:</span> {formData.audience.locations.length > 0 ? formData.audience.locations.join(', ') : 'None'}
            </p>
            <p className="text-sm font-medium text-neutral-900">
              <span className="text-neutral-500">Interests:</span> {formData.audience.interests.length > 0 ? formData.audience.interests.join(', ') : 'None'}
            </p>
          </div>
        </div>

        {/* Creative Preview */}
        <div>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Ad Preview</h3>
          <div className="rounded-[var(--radius-md)] border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-neutral-200"></div>
              <div>
                <div className="h-3 w-20 rounded bg-neutral-200"></div>
                <div className="mt-1 h-2 w-12 rounded bg-neutral-100"></div>
              </div>
            </div>
            <h3 className="mb-2 text-base font-bold text-primary break-words">
              {formData.creative.headline}
            </h3>
            <p className="text-sm text-neutral-600 break-words">
              {formData.creative.description}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase">Sponsored</span>
              <button className="rounded bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-neutral-200">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-[var(--radius-md)] border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 shadow-xs transition-all hover:bg-neutral-50 disabled:opacity-50"
        >
          ← {t('wizard.back', 'Back')}
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-gradient-primary rounded-[var(--radius-md)] px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('wizard.launching', 'Launching...')}
            </>
          ) : (
            t('wizard.launch', 'Launch Campaign 🚀')
          )}
        </button>
      </div>
    </div>
  );
}
