/**
 * Sentry error-tracking initialization for the AdSync backend.
 *
 * Initializes only when SENTRY_DSN is present. If missing, logs a
 * warning and continues — this allows local dev without a Sentry account.
 */
import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('SENTRY_DSN not set — Sentry error tracking is disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });

  logger.info('Sentry initialized for backend error tracking');
}

export function captureException(error: unknown, context?: Record<string, any>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  } else {
    logger.warn({ error, context }, '[Mock Sentry Capture] Exception captured locally (SENTRY_DSN not set)');
  }
}

export { Sentry };
