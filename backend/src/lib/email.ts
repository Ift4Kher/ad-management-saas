/**
 * Mock Email Service (Development)
 *
 * Logs clickable verification and password reset links to the Pino console logger.
 * TODO: Replace with production provider (Resend, SendGrid, or AWS SES) for v1 production deployment.
 */

import { logger } from './logger.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  logger.info(
    {
      to: email,
      subject: 'Verify your AdSync Account Email',
      link: verifyUrl,
    },
    `✉️ [DEV MOCK EMAIL] Verification email sent to ${email}. Verification Link: ${verifyUrl}`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  logger.info(
    {
      to: email,
      subject: 'Reset your AdSync Password',
      link: resetUrl,
    },
    `✉️ [DEV MOCK EMAIL] Password reset email sent to ${email}. Reset Link: ${resetUrl}`,
  );
}
