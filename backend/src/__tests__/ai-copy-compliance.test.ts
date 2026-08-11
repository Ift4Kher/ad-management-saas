import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/db.js';
import { generateAdCopyVariants, checkPolicyCompliance, logSelectedVariant } from '../services/ai-copy-service.js';

describe('Phase 9 AI Ad Copy Generation & Policy Compliance Guardrails', () => {
  let workspaceId: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `ai-copy-test-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'AI Copy Test User',
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    // Create test workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'AI Copy Workspace',
        ownerId: user.id,
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.creativeAsset.deleteMany({ where: { workspaceId } });
      await prisma.aiUsageLog.deleteMany({ where: { workspaceId } });
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it('1. should detect policy violations for prohibited health and financial claims', () => {
    const healthCheck = checkPolicyCompliance(
      'Miracle Cure Guaranteed Weight Loss',
      'Doctor secret formula for instant healing',
    );
    expect(healthCheck.compliant).toBe(false);
    expect(healthCheck.policyViolations.length).toBeGreaterThan(0);
    expect(healthCheck.policyViolations[0]).toContain('medical or health claims');

    const financialCheck = checkPolicyCompliance(
      'Guaranteed 1000% Crypto Profit Secret',
      'Get rich quick with risk free investment',
    );
    expect(financialCheck.compliant).toBe(false);
    expect(financialCheck.policyViolations.length).toBeGreaterThan(0);
    expect(financialCheck.policyViolations[0]).toContain('financial promises');

    const cleanCheck = checkPolicyCompliance(
      'Boost Your E-Commerce Sales Today',
      'Automated marketing platform trusted by 5,000+ online stores.',
    );
    expect(cleanCheck.compliant).toBe(true);
    expect(cleanCheck.policyViolations.length).toBe(0);
  });

  it('2. should generate 3 copy variants, perform compliance checks, and record in AiUsageLog', async () => {
    const result = await generateAdCopyVariants(
      workspaceId,
      userId,
      'SaaS Ad Management Software',
      'Digital Agencies',
    );

    expect(result.variants).toHaveLength(3);
    expect(result.usageLogId).toBeDefined();

    // Verify AiUsageLog created in DB
    const log = await prisma.aiUsageLog.findUnique({
      where: { id: result.usageLogId },
    });

    expect(log).toBeDefined();
    expect(log?.feature).toBe('AI_AD_COPY_GENERATION');
    expect(log?.tokensUsed).toBeGreaterThan(0);
  });

  it('3. should flag policy-violating variants with compliant=false when mock fail trigger is provided', async () => {
    const result = await generateAdCopyVariants(
      workspaceId,
      userId,
      'Miracle cure weight loss pill',
      'Fitness Enthusiasts',
    );

    expect(result.variants).toHaveLength(3);
    const nonCompliant = result.variants.find((v) => !v.compliant);

    expect(nonCompliant).toBeDefined();
    expect(nonCompliant?.headline).toContain('Miracle Cure');
    expect(nonCompliant?.policyViolations.length).toBeGreaterThan(0);
  });

  it('4. should log selected variant choice in AiUsageLog for usage metering', async () => {
    const result = await generateAdCopyVariants(
      workspaceId,
      userId,
      'Analytics software',
    );

    const compliantVariant = result.variants.find((v) => v.compliant)!;

    const selectionLog = await logSelectedVariant(
      workspaceId,
      userId,
      result.usageLogId,
      compliantVariant,
    );

    expect(selectionLog.id).toBeDefined();
    expect(selectionLog.feature).toBe('AI_COPY_SELECTION');
  });
});
