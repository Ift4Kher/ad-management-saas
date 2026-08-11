/**
 * JWT Utility Module
 *
 * Signs and verifies JWT session tokens and action tokens (email verification, password reset).
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_placeholder_change_in_production_min32chars';

export interface UserSessionPayload {
  userId: string;
  email: string;
}

export interface ActionTokenPayload {
  userId: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
}

/**
 * Generate a 7-day JWT session token for an authenticated user.
 */
export function generateToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify a JWT session token. Returns payload or null if invalid/expired.
 */
export function verifyToken(token: string): UserSessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSessionPayload;
    if (decoded && decoded.userId && decoded.email) {
      return { userId: decoded.userId, email: decoded.email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a 24-hour action token (e.g. for email verification or password reset).
 */
export function generateActionToken(payload: ActionTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify a 24-hour action token.
 */
export function verifyActionToken(token: string): ActionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ActionTokenPayload;
    if (decoded && decoded.userId && decoded.type) {
      return { userId: decoded.userId, type: decoded.type };
    }
    return null;
  } catch {
    return null;
  }
}
