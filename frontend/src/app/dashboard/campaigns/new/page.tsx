'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import StepObjective from '@/components/campaign-wizard/StepObjective';
import StepAudience from '@/components/campaign-wizard/StepAudience';
import StepBudget from '@/components/campaign-wizard/StepBudget';
import StepCreative from '@/components/campaign-wizard/StepCreative';
import StepReview from '@/components/campaign-wizard/StepReview';

export interface CampaignWizardData {
  name: string;
  platform: 'GOOGLE' | 'META' | 'TIKTOK' | '';
  objective: string;
  audience: {
    locations: string[];
    ageRange: [number, number];
    interests: string[];
  };
  budget: string;
  creative: {
    headline: string;
    description: string;
  };
}

const defaultData: CampaignWizardData = {
  name: '',
  platform: '',
  objective: '',
  audience: {
    locations: [],
    ageRange: [18, 65],
    interests: [],
  },
  budget: '500',
  creative: {
    headline: '',
    description: '',
  },
};

export default function CampaignWizardPage() {
  const router = useRouter();
  const { activeWorkspace, authFetch } = useAuth();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignWizardData>(defaultData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 5;

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const updateFormData = (updates: Partial<CampaignWizardData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleLaunch = async () => {
    if (!activeWorkspace) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/workspaces/${activeWorkspace.id}/campaigns`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name || 'Untitled Campaign',
          platform: formData.platform,
          objective: formData.objective,
          budget: Number(formData.budget),
          metadata: {
            audience: formData.audience,
            creative: formData.creative,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create campaign.');
      }

      // Success — redirect to campaign detail page so user can publish
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setIsSubmitting(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <main className="mx-auto flex-1 w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">{t('wizard.title', 'Create New Campaign')}</h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          {t('wizard.subtitle', 'Follow the steps to set up and launch your advertising campaign.')}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              currentStep >= step ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'
            }`}>
              {step}
            </div>
            {step < 5 && (
              <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-colors ${
                currentStep > step ? 'bg-primary' : 'bg-neutral-100'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-4 sm:p-8 shadow-xs">
        {currentStep === 1 && (
          <StepObjective formData={formData} updateFormData={updateFormData} onNext={handleNext} />
        )}
        {currentStep === 2 && (
          <StepAudience formData={formData} updateFormData={updateFormData} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <StepBudget formData={formData} updateFormData={updateFormData} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && (
          <StepCreative formData={formData} updateFormData={updateFormData} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 5 && (
          <StepReview 
            formData={formData} 
            onBack={handleBack} 
            onSubmit={handleLaunch} 
            isSubmitting={isSubmitting} 
          />
        )}
      </div>
    </main>
  );
}
