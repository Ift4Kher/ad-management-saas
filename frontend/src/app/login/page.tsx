/**
 * AdSync Login Page — fully localized via i18next
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to log in.');
      }

      login(data.token, data.user, data.workspaces);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-surface px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-neutral-900">{t('app_name')}</span>
        </Link>
        <LanguageToggle />
      </header>

      {/* Main Container */}
      <main className="flex flex-1 items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-6 sm:p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-bold text-neutral-900">{t('auth.login_title')}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              {t('auth.login_subtitle')}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('auth.email_label')}</label>
              <input
                type="email"
                required
                placeholder={t('auth.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">{t('auth.password_label')}</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <input
                type="password"
                required
                placeholder={t('auth.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-primary w-full rounded-[var(--radius-md)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? t('auth.logging_in') : t('auth.log_in')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            {t('auth.no_account')}{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              {t('auth.sign_up')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <I18nProvider>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </I18nProvider>
  );
}
