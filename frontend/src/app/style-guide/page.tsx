/**
 * AdSync Style Guide — Internal design system reference page.
 *
 * NOT linked in navigation. Accessible at /style-guide.
 * Renders all design tokens: colors, typography, buttons, cards,
 * form inputs, status badges, and the gradient CTA — so the team
 * can visually confirm the system is cohesive before building real UI.
 */
'use client';

import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';

function StyleGuideContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-surface px-8 py-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('style_guide.title')}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t('style_guide.subtitle')}</p>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-8 py-12">

        {/* ================================================================
         * SECTION: Color Palette
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.colors')}</h2>

          {/* Primary Gradient */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-neutral-700">{t('style_guide.primary_gradient')}</h3>
            <div className="mt-3 flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-[var(--radius-md)] bg-primary-start" />
                <span className="text-xs text-neutral-600">#4F46E5</span>
                <span className="text-xs text-neutral-400">primary-start</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-[var(--radius-md)] bg-primary-end" />
                <span className="text-xs text-neutral-600">#7C3AED</span>
                <span className="text-xs text-neutral-400">primary-end</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-gradient-primary h-16 w-24 rounded-[var(--radius-md)]" />
                <span className="text-xs text-neutral-600">135° gradient</span>
                <span className="text-xs text-neutral-400">bg-gradient-primary</span>
              </div>
            </div>
          </div>

          {/* Neutrals */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-neutral-700">{t('style_guide.neutrals')}</h3>
            <div className="mt-3 flex flex-wrap gap-4">
              {[
                { name: '900', color: 'bg-neutral-900', hex: '#0F172A' },
                { name: '700', color: 'bg-neutral-700', hex: '#334155' },
                { name: '600', color: 'bg-neutral-600', hex: '#475569' },
                { name: '400', color: 'bg-neutral-400', hex: '#94A3B8' },
                { name: '300', color: 'bg-neutral-300', hex: '#CBD5E1' },
                { name: '200', color: 'bg-neutral-200', hex: '#E2E8F0' },
                { name: '100', color: 'bg-neutral-100', hex: '#F1F5F9' },
                { name: '50', color: 'bg-neutral-50', hex: '#F8FAFC' },
              ].map((swatch) => (
                <div key={swatch.name} className="flex flex-col items-center gap-2">
                  <div className={`h-12 w-12 rounded-[var(--radius-md)] border border-neutral-200 ${swatch.color}`} />
                  <span className="text-xs text-neutral-600">{swatch.hex}</span>
                  <span className="text-xs text-neutral-400">{swatch.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-neutral-700">{t('style_guide.semantic')}</h3>
            <div className="mt-3 flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-[var(--radius-md)] bg-success" />
                <span className="text-xs text-neutral-600">#16A34A</span>
                <span className="text-xs text-neutral-400">Success</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-[var(--radius-md)] bg-warning" />
                <span className="text-xs text-neutral-600">#D97706</span>
                <span className="text-xs text-neutral-400">Warning</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-[var(--radius-md)] bg-error" />
                <span className="text-xs text-neutral-600">#DC2626</span>
                <span className="text-xs text-neutral-400">Error</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
         * SECTION: Typography
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.typography')}</h2>
          <div className="mt-6 space-y-6 rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-8">
            <div className="flex items-baseline justify-between border-b border-neutral-100 pb-4">
              <span className="text-2xl font-bold text-neutral-900">Display — 36px / Bold (700)</span>
              <span className="text-xs text-neutral-400">text-2xl font-bold</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-neutral-100 pb-4">
              <span className="text-xl font-semibold text-neutral-900">Heading — 28px / Semibold (600)</span>
              <span className="text-xs text-neutral-400">text-xl font-semibold</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-neutral-100 pb-4">
              <span className="text-lg font-semibold text-neutral-900">Subheading — 20px / Semibold (600)</span>
              <span className="text-xs text-neutral-400">text-lg font-semibold</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-neutral-100 pb-4">
              <span className="text-base text-neutral-900">Body — 16px / Regular (400)</span>
              <span className="text-xs text-neutral-400">text-base</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-neutral-100 pb-4">
              <span className="text-sm text-neutral-600">Secondary — 14px / Regular (400)</span>
              <span className="text-xs text-neutral-400">text-sm</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-neutral-400">Caption — 12px / Regular (400)</span>
              <span className="text-xs text-neutral-400">text-xs</span>
            </div>
          </div>
        </section>

        {/* ================================================================
         * SECTION: Buttons
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.buttons')}</h2>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {/* Primary (gradient CTA) */}
            <button className="bg-gradient-primary rounded-[var(--radius-md)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg">
              {t('cta.get_started')}
            </button>

            {/* Secondary */}
            <button className="rounded-[var(--radius-md)] border border-neutral-200 bg-surface px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50">
              {t('cta.learn_more')}
            </button>

            {/* Outline */}
            <button className="rounded-[var(--radius-md)] border border-primary-start px-6 py-3 text-sm font-semibold text-primary-start transition-colors hover:bg-primary-start/5">
              Outline
            </button>

            {/* Disabled */}
            <button
              disabled
              className="cursor-not-allowed rounded-[var(--radius-md)] bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-400"
            >
              Disabled
            </button>
          </div>
        </section>

        {/* ================================================================
         * SECTION: Cards
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.cards')}</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-sm">
              <div className="text-2xl font-bold text-neutral-900">$12,450</div>
              <div className="mt-1 text-sm text-neutral-600">Total Ad Spend</div>
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg>
                +12.5%
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-sm">
              <div className="text-2xl font-bold text-neutral-900">3.2x</div>
              <div className="mt-1 text-sm text-neutral-600">Average ROAS</div>
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg>
                +0.4x
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-sm">
              <div className="text-2xl font-bold text-neutral-900">24</div>
              <div className="mt-1 text-sm text-neutral-600">Active Campaigns</div>
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
                3 need attention
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
         * SECTION: Form Inputs
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.forms')}</h2>
          <div className="mt-6 max-w-md space-y-4 rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-8">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Campaign Name
              </label>
              <input type="text" placeholder="Enter campaign name..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Email Address
              </label>
              <input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Platform
              </label>
              <select>
                <option>Google Ads</option>
                <option>Meta Ads</option>
                <option>TikTok Ads</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                className="h-4 w-4 rounded-[var(--radius-sm)] border-neutral-300 text-primary accent-primary-start"
                style={{ width: 'auto' }}
              />
              <label htmlFor="terms" className="text-sm text-neutral-600">
                I agree to the Terms of Service
              </label>
            </div>
            <button className="bg-gradient-primary w-full rounded-[var(--radius-md)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg">
              {t('cta.submit')}
            </button>
          </div>
        </section>

        {/* ================================================================
         * SECTION: Status Badges
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.status_badges')}</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Pacing Warning
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-error">
              <span className="h-1.5 w-1.5 rounded-full bg-error" />
              Overspend
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Paused
            </span>
          </div>
        </section>

        {/* ================================================================
         * SECTION: Spacing Grid
         * ============================================================== */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900">{t('style_guide.spacing')}</h2>
          <div className="mt-6 space-y-3">
            {[
              { label: '4px (1 unit)', width: 'w-1' },
              { label: '8px (2 units)', width: 'w-2' },
              { label: '12px (3 units)', width: 'w-3' },
              { label: '16px (4 units)', width: 'w-4' },
              { label: '24px (6 units)', width: 'w-6' },
              { label: '32px (8 units)', width: 'w-8' },
              { label: '48px (12 units)', width: 'w-12' },
              { label: '64px (16 units)', width: 'w-16' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className={`h-4 rounded-[var(--radius-sm)] bg-primary-start/20 ${item.width}`} />
                <span className="text-xs text-neutral-600">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function StyleGuidePage() {
  return (
    <I18nProvider>
      <StyleGuideContent />
    </I18nProvider>
  );
}
