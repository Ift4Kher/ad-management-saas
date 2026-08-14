/**
 * AdSync Homepage
 *
 * Displays branding, fetches health-check from the backend API,
 * and shows the language toggle. Uses design tokens throughout.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';
import LanguageToggle from '@/components/LanguageToggle';

interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    redis: string;
  };
  version: string;
}

function HomeContent() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/api/health`)
      .then(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(text.slice(0, 80));
        }
      })
      .then((data: HealthResponse) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-neutral-900">{t('app_name')}</span>
        </div>
        <LanguageToggle />
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {t('app_name')}
          </h1>
          <p className="mt-2 text-lg text-neutral-600">
            {t('tagline')}
          </p>
          <p className="mt-4 text-base text-neutral-600 leading-relaxed">
            {t('description')}
          </p>

          {/* Gradient CTA button — the ONE gradient element on this page */}
          <div className="mt-8">
            <Link
              href="/signup"
              className="bg-gradient-primary inline-flex items-center gap-2 rounded-[var(--radius-md)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-start"
            >
              {t('cta.get_started')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Health status card */}
        <div className="mt-16 w-full max-w-md">
          <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">{t('health.title')}</h2>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary" />
                {t('health.checking')}
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-error">
                <span className="inline-block h-2 w-2 rounded-full bg-error" />
                {t('health.status_error')}: {error}
              </div>
            )}

            {health && !loading && (
              <div className="mt-4 space-y-3">
                {/* Overall status */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      health.status === 'ok' ? 'bg-success' : 'bg-warning'
                    }`}
                  />
                  <span className="text-sm font-medium text-neutral-700">
                    {health.status === 'ok' ? t('health.status_ok') : t('health.status_degraded')}
                  </span>
                </div>

                {/* Redis status */}
                <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-neutral-50 px-4 py-2.5">
                  <span className="text-sm text-neutral-600">{t('health.redis')}</span>
                  <span
                    className={`text-sm font-medium ${
                      health.services.redis === 'connected' ? 'text-success' : 'text-error'
                    }`}
                  >
                    {health.services.redis === 'connected'
                      ? t('health.connected')
                      : t('health.disconnected')}
                  </span>
                </div>

                {/* Version + timestamp */}
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>v{health.version}</span>
                  <span>{new Date(health.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-surface px-6 py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} AdSync. All rights reserved.
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <HomeContent />
    </I18nProvider>
  );
}
