import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignWizardData } from '@/app/dashboard/campaigns/new/page';
import AiCopyGeneratorModal from '@/components/AiCopyGeneratorModal';

interface Props {
  formData: CampaignWizardData;
  updateFormData: (updates: Partial<CampaignWizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepCreative({ formData, updateFormData, onNext, onBack }: Props) {
  const { t } = useTranslation();
  const [showAiModal, setShowAiModal] = useState(false);

  const isValid = formData.creative.headline.trim() !== '' && formData.creative.description.trim() !== '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">{t('wizard.step4.title', 'Ad Creative')}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t('wizard.step4.subtitle', 'Craft the message your audience will see.')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          ✨ AI Generate Ad Copy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Input Fields */}
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              {t('wizard.step4.headlineLabel', 'Headline')}
            </label>
            <input
              type="text"
              maxLength={60}
              value={formData.creative.headline}
              onChange={(e) => updateFormData({ creative: { ...formData.creative, headline: e.target.value } })}
              placeholder={t('wizard.step4.headlinePlaceholder', 'Enter a catchy headline')}
              className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <div className="mt-1 text-right text-[11px] text-neutral-400">
              {formData.creative.headline.length} / 60
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              {t('wizard.step4.descriptionLabel', 'Description')}
            </label>
            <textarea
              rows={4}
              maxLength={150}
              value={formData.creative.description}
              onChange={(e) => updateFormData({ creative: { ...formData.creative, description: e.target.value } })}
              placeholder={t('wizard.step4.descriptionPlaceholder', 'Describe your offer or product')}
              className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <div className="mt-1 text-right text-[11px] text-neutral-400">
              {formData.creative.description.length} / 150
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            {t('wizard.step4.previewLabel', 'Live Preview')}
          </label>
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-neutral-50 p-6">
            <div className="rounded-[var(--radius-md)] border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-neutral-200"></div>
                <div>
                  <div className="h-3 w-20 rounded bg-neutral-200"></div>
                  <div className="mt-1 h-2 w-12 rounded bg-neutral-100"></div>
                </div>
              </div>
              <h3 className="mb-2 text-base font-bold text-primary break-words">
                {formData.creative.headline || 'Your Headline Here'}
              </h3>
              <p className="text-sm text-neutral-600 break-words">
                {formData.creative.description || 'Your ad description will appear here.'}
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
          disabled={!isValid}
          className="bg-gradient-primary rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:shadow-md disabled:opacity-50"
        >
          {t('wizard.next', 'Next Step')} →
        </button>
      </div>

      <AiCopyGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSelectCopy={(headline, description) => {
          updateFormData({
            creative: {
              ...formData.creative,
              headline,
              description,
            },
          });
        }}
      />
    </div>
  );
}
