/**
 * Workspace Team Management Service
 *
 * Handles workspace member listing, invitation by email, role updates, and member removal.
 * Enforced via RBAC middleware layer.
 */

import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/db.js';

export async function listTeamMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    emailVerified: Boolean(m.user.emailVerifiedAt),
    joinedAt: m.createdAt,
  }));
}

export async function inviteTeamMember(workspaceId: string, email: string, role: WorkspaceRole) {
  // Find or create user placeholder
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: email.split('@')[0],
        passwordHash: 'pending_invitation_hash',
      },
    });
  }

  // Check if member already in workspace
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (existingMember) {
    throw new Error('User is already a member of this workspace.');
  }

  return prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: user.id,
      role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function updateMemberRole(workspaceId: string, userId: string, newRole: WorkspaceRole) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (workspace?.ownerId === userId && newRole !== 'OWNER') {
    throw new Error('Workspace owner role cannot be downgraded.');
  }

  return prisma.workspaceMember.update({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    data: { role: newRole },
  });
}

export async function removeTeamMember(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (workspace?.ownerId === userId) {
    throw new Error('Workspace owner cannot be removed from workspace.');
  }

  return prisma.workspaceMember.delete({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
}
