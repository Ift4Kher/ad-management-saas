/**
 * AdSync Forgot Password Page — fully localized via i18next
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { AuthProvider } from '@/lib/auth-context';

function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setSubmitted(true);
      setMessage(data.message || 'Check your email for password reset instructions.');
    } catch {
      setError('Failed to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
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

      <main className="flex flex-1 items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-6 sm:p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-bold text-neutral-900">{t('auth.forgot_title')}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              {t('auth.forgot_subtitle')}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="mt-6 text-center space-y-4">
              <div className="rounded-[var(--radius-md)] border border-success/20 bg-success/10 p-4 text-sm text-success">
                {message}
              </div>
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-primary hover:underline"
              >
                {t('auth.back_to_login')}
              </Link>
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-primary w-full rounded-[var(--radius-md)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {submitting ? t('auth.sending') : t('auth.send_reset_link')}
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                  {t('auth.back_to_login')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ForgotPasswordForm />
      </AuthProvider>
    </I18nProvider>
  );
}
