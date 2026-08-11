/**
 * AdSync Reset Password Page
 */
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import I18nProvider from '@/components/I18nProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { AuthProvider } from '@/lib/auth-context';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccessMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred resetting password.');
      setSubmitting(false);
    }
  };

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
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-bold text-neutral-900">Set New Password</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Enter your new account password below
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-error/20 bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-success/20 bg-success/10 p-3 text-sm text-success">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-primary w-full rounded-[var(--radius-md)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </AuthProvider>
    </I18nProvider>
  );
}
