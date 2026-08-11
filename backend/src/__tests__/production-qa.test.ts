import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/db.js';
import { encryptToken, decryptToken } from '../lib/encryption.js';
import { checkPolicyCompliance } from '../services/ai-copy-service.js';
import { WorkspaceRole } from '@prisma/client';

describe('Phase 12 Production QA Integration & Security Test Suite', () => {
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `qa-user-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'QA Test User',
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: 'QA Test Workspace',
        ownerId: user.id,
        members: {
          create: [{ userId: user.id, role: WorkspaceRole.OWNER }],
        },
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('1. should securely encrypt and decrypt sensitive tokens using AES-256-GCM', () => {
    const rawToken = 'oauth_secret_access_token_xyz123!';
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toEqual(rawToken);
    expect(encrypted).toContain(':'); // IV and ciphertext separated by colon

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toEqual(rawToken);
  });

  it('2. should enforce workspace isolation — resources scoped exclusively to target workspaceId', async () => {
    // Create an ad account connection under workspaceId
    const connection = await prisma.adAccountConnection.create({
      data: {
        workspaceId,
        platform: 'GOOGLE',
        accessTokenEncrypted: encryptToken('test_token'),
        status: 'CONNECTED',
      },
    });

    const foundInWorkspace = await prisma.adAccountConnection.findFirst({
      where: { id: connection.id, workspaceId },
    });
    expect(foundInWorkspace).toBeDefined();

    // Querying with non-matching workspaceId should return null (workspace isolation)
    const isolatedCheck = await prisma.adAccountConnection.findFirst({
      where: { id: connection.id, workspaceId: 'fake_other_workspace_id' },
    });
    expect(isolatedCheck).toBeNull();

    await prisma.adAccountConnection.delete({ where: { id: connection.id } });
  });

  it('3. should accurately detect ad policy violations (health claims & financial promises)', () => {
    // Compliant ad copy
    const compliant = checkPolicyCompliance(
      'Boost Your Online Store Sales',
      'Discover our summer collection with 20% discount on all orders.'
    );
    expect(compliant.compliant).toBe(true);
    expect(compliant.policyViolations.length).toBe(0);

    // Non-compliant health claim
    const healthViolation = checkPolicyCompliance(
      'Miracle Cure for Pain',
      'Guaranteed 100% cure for arthritis in 7 days.'
    );
    expect(healthViolation.compliant).toBe(false);
    expect(healthViolation.policyViolations[0]).toContain('medical or health claims');

    // Non-compliant financial claim
    const financialViolation = checkPolicyCompliance(
      'Guaranteed 1000% ROI Investment',
      'Get rich fast with zero risk cryptocurrency trading.'
    );
    expect(financialViolation.compliant).toBe(false);
    expect(financialViolation.policyViolations[0]).toContain('financial');
  });
});
