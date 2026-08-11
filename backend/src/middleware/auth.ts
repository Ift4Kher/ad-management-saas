/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 *
 * HARD SECURITY REQUIREMENTS:
 * 1. Authentication: Validates JWT session tokens on protected routes.
 * 2. Data Isolation & RBAC: Every workspace route MUST verify that the authenticated user
 *    belongs to the target workspace AND holds the minimum required role (OWNER > ADMIN > EDITOR > VIEWER).
 * 3. Unscoped queries on workspace data are treated as security bugs.
 */

import type { Request, Response, NextFunction } from 'express';
import { WorkspaceRole, type User } from '@prisma/client';
import { verifyToken } from '../lib/jwt.js';
import { prisma, getScopedDb } from '../lib/db.js';

// Extend Express Request interface to include user and workspace context
declare global {
  namespace Express {
    interface Request {
      user?: User;
      workspaceId?: string;
      memberRole?: WorkspaceRole;
      scopedDb?: ReturnType<typeof getScopedDb>;
    }
  }
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

/**
 * Authentication Middleware
 * Validates JWT Bearer token from Authorization header.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or invalid Authorization header.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired authentication session.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    res.status(401).json({ error: 'User associated with session no longer exists.' });
    return;
  }

  req.user = user;
  next();
}

/**
 * Email Verification Guard Middleware
 * Restricts actions (such as connecting ad accounts or launching live campaigns) until email is verified.
 */
export function requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (!req.user.emailVerifiedAt) {
    res.status(403).json({ error: 'Email verification required to perform this action. Please verify your email.' });
    return;
  }

  next();
}

/**
 * Workspace Scoping & Role-Based Access Control (RBAC) Middleware
 *
 * Checks that:
 * 1. Target `workspaceId` is specified (via X-Workspace-Id header, route params, or query string).
 * 2. The authenticated user is an active member of the workspace.
 * 3. The user's role meets or exceeds `minRole` requirement (default VIEWER).
 *
 * Attaches `req.workspaceId`, `req.memberRole`, and `req.scopedDb` (`getScopedDb(workspaceId)`).
 *
 * @param minRole Minimum WorkspaceRole required to execute the route (OWNER, ADMIN, EDITOR, VIEWER).
 */
export function requireWorkspaceAccess(minRole: WorkspaceRole = WorkspaceRole.VIEWER) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Extract workspace ID from header, route parameter, query string, or body
    const workspaceId =
      (req.headers['x-workspace-id'] as string) ||
      req.params.workspaceId ||
      (req.query.workspaceId as string) ||
      req.body.workspaceId;

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID is required (pass via X-Workspace-Id header or workspaceId parameter).' });
      return;
    }

    // Check membership in target workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied. You are not a member of this workspace.' });
      return;
    }

    // Verify role permissions hierarchy
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      res.status(403).json({
        error: `Insufficient workspace permissions. Action requires '${minRole}' role, but your role is '${membership.role}'.`,
      });
      return;
    }

    // Attach workspace context & scoped database client to request
    req.workspaceId = workspaceId;
    req.memberRole = membership.role;
    req.scopedDb = getScopedDb(workspaceId);

    next();
  };
}
