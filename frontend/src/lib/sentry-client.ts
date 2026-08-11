/**
 * Sentry client-side initialization stub for the AdSync frontend.
 *
 * Initializes only when NEXT_PUBLIC_SENTRY_DSN is present.
 */
import * as Sentry from '@sentry/react';

export function initSentryClient(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return; // Silently skip — Sentry is optional in development
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}
