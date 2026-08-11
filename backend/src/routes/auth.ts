/**
 * Authentication API Routes
 *
 * Handles Signup, Login, Me Session Check, Email Verification, Forgot Password, and Reset Password.
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/db.js';
import { generateToken, generateActionToken, verifyActionToken } from '../lib/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { WorkspaceRole } from '@prisma/client';

export const authRouter = Router();

/**
 * POST /api/auth/signup
 * Register a new user, auto-create default workspace, send verification email.
 */
authRouter.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, locale } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User, default Workspace, and OWNER WorkspaceMember in a transaction
    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          emailVerifiedAt: process.env.NODE_ENV === 'production' ? null : new Date(),
        },
      });

      const newWorkspace = await tx.workspace.create({
        data: {
          name: `${name.trim()}'s Workspace`,
          ownerId: newUser.id,
          locale: locale || 'en',
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: newWorkspace.id,
          role: WorkspaceRole.OWNER,
        },
      });

      return { user: newUser, workspace: newWorkspace };
    });

    // Generate verification token & send dev mock email
    const verificationToken = generateActionToken({
      userId: user.id,
      type: 'VERIFY_EMAIL',
    });

    await sendVerificationEmail(user.email, verificationToken);

    // Generate JWT session token
    const token = generateToken({ userId: user.id, email: user.email });

    logger.info({ userId: user.id, email: user.email, workspaceId: workspace.id }, 'User signed up successfully');

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        locale: user.locale,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        role: WorkspaceRole.OWNER,
        locale: workspace.locale,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Signup error');
    res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user credentials and return JWT session token + workspace list.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Verify bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Generate JWT session token
    const token = generateToken({ userId: user.id, email: user.email });

    const workspaces = user.memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      locale: m.workspace.locale,
    }));

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        locale: user.locale,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
      workspaces,
    });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current user profile and memberships.
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      locale: m.workspace.locale,
    }));

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        locale: user.locale,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
      workspaces,
    });
  } catch (err) {
    logger.error({ err }, 'Get me session error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/auth/verify-email
 * Accepts email verification token and sets emailVerifiedAt = now().
 */
authRouter.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }

    const payload = verifyActionToken(token);

    if (!payload || payload.type !== 'VERIFY_EMAIL') {
      res.status(400).json({ error: 'Invalid or expired email verification token.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerifiedAt: new Date() },
    });

    logger.info({ userId: updatedUser.id, email: updatedUser.email }, 'Email verified successfully');

    res.json({
      message: 'Email verified successfully.',
      emailVerifiedAt: updatedUser.emailVerifiedAt,
    });
  } catch (err) {
    logger.error({ err }, 'Verify email error');
    res.status(500).json({ error: 'Internal server error during email verification.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Sends password reset token link via mock email.
 */
authRouter.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      const resetToken = generateActionToken({ userId: user.id, type: 'RESET_PASSWORD' });
      await sendPasswordResetEmail(user.email, resetToken);
    }

    // Always return generic success message to prevent account enumeration attacks
    res.json({
      message: 'If that email address exists in our system, a password reset link has been sent.',
    });
  } catch (err) {
    logger.error({ err }, 'Forgot password error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Resets password using reset token and new password.
 */
authRouter.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const payload = verifyActionToken(token);

    if (!payload || payload.type !== 'RESET_PASSWORD') {
      res.status(400).json({ error: 'Invalid or expired password reset token.' });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info({ userId: payload.userId }, 'Password reset successfully');

    res.json({
      message: 'Password reset successfully. You may now log in with your new password.',
    });
  } catch (err) {
    logger.error({ err }, 'Reset password error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * PATCH /api/auth/locale
 * Update the authenticated user's persistent language preference.
 */
authRouter.patch('/locale', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { locale } = req.body;

    if (!locale || !['en', 'bn'].includes(locale)) {
      res.status(400).json({ error: 'Invalid locale. Supported: en, bn' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { locale },
    });

    logger.info({ userId, locale }, 'User locale preference updated');
    res.json({ message: 'Locale updated successfully.', locale });
  } catch (err) {
    logger.error({ err }, 'Update locale error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});
