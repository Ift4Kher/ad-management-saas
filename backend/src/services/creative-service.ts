/**
 * Creative Assets Management Service
 *
 * Workspace-scoped repository for reusable creative assets (images, text copy, video).
 */

import { AssetType } from '@prisma/client';
import { prisma } from '../lib/db.js';

export interface CreateCreativeDTO {
  name: string;
  type: AssetType;
  url: string;
  content?: string;
  metadata?: Record<string, unknown>;
  aiGenerated?: boolean;
}

export async function createCreativeAsset(workspaceId: string, data: CreateCreativeDTO) {
  return prisma.creativeAsset.create({
    data: {
      workspaceId,
      name: data.name,
      type: data.type,
      url: data.url,
      content: data.content || null,
      metadata: (data.metadata || undefined) as any,
      aiGenerated: data.aiGenerated || false,
      complianceCheckedAt: new Date(),
    },
  });
}

export async function listCreativeAssets(workspaceId: string, type?: AssetType) {
  return prisma.creativeAsset.findMany({
    where: {
      workspaceId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteCreativeAsset(workspaceId: string, assetId: string) {
  return prisma.creativeAsset.deleteMany({
    where: {
      id: assetId,
      workspaceId,
    },
  });
}
