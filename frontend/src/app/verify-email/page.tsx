/**
 * AdSync Email Verification Page
 */
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import I18nProvider from '@/components/I18nProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { reloadSession } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email address...');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid email verification link. Token is missing.');
      return;
    }

    fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.emailVerifiedAt) {
          setStatus('success');
          setMessage('Your email address has been verified successfully!');
          reloadSession();
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email address.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error verifying email address.');
      });
  }, [token, API_URL, reloadSession]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-surface px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-neutral-900">AdSync</span>
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-8 text-center shadow-sm">
          {status === 'loading' && (
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-neutral-900">Verifying Email...</h2>
              <p className="mt-2 text-sm text-neutral-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-bold text-neutral-900">Email Verified!</h2>
              <p className="mt-2 text-sm text-neutral-600">{message}</p>
              <Link
                href="/dashboard"
                className="bg-gradient-primary mt-6 inline-block w-full rounded-[var(--radius-md)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-bold text-neutral-900">Verification Failed</h2>
              <p className="mt-2 text-sm text-neutral-600">{message}</p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block w-full rounded-[var(--radius-md)] border border-neutral-200 bg-surface py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Return to Dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </AuthProvider>
    </I18nProvider>
  );
}
