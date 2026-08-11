import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/db.js';
import { inviteTeamMember, updateMemberRole, removeTeamMember } from '../services/team-service.js';
import { processStripeWebhookEvent, createMfsCheckout, executeMfsPayment, getWorkspaceUsageAndPlan } from '../services/billing-service.js';
import { PlanTier, SubscriptionStatus } from '@prisma/client';

describe('Phase 10 Team Management & Billing System Integration Tests', () => {
  let ownerId: string;
  let viewerId: string;
  let workspaceId: string;

  beforeAll(async () => {
    // Create Owner user
    const owner = await prisma.user.create({
      data: {
        email: `owner-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Workspace Owner',
        emailVerifiedAt: new Date(),
      },
    });
    ownerId = owner.id;

    // Create Viewer user
    const viewer = await prisma.user.create({
      data: {
        email: `viewer-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Workspace Viewer',
        emailVerifiedAt: new Date(),
      },
    });
    viewerId = viewer.id;

    // Create Workspace owned by owner
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Billing Test Workspace',
        ownerId: owner.id,
        plan: PlanTier.STARTER,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        members: {
          create: [
            { userId: owner.id, role: 'OWNER' },
            { userId: viewer.id, role: 'VIEWER' },
          ],
        },
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.subscriptionEvent.deleteMany({ where: { workspaceId } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } });
    if (viewerId) await prisma.user.deleteMany({ where: { id: viewerId } });
  });

  it('1. should invite member and update member roles successfully', async () => {
    const inviteEmail = `invited-${Date.now()}@example.com`;
    const member = await inviteTeamMember(workspaceId, inviteEmail, 'EDITOR');

    expect(member.role).toBe('EDITOR');
    expect(member.user.email).toBe(inviteEmail);

    // Update role to ADMIN
    const updated = await updateMemberRole(workspaceId, member.userId, 'ADMIN');
    expect(updated.role).toBe('ADMIN');

    // Remove member
    await removeTeamMember(workspaceId, member.userId);
    const check = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: member.userId, workspaceId } },
    });
    expect(check).toBeNull();
  }, 20000);

  it('2. should process Stripe invoice.payment_failed webhook and set status to PAST_DUE (visible in-app state)', async () => {
    await processStripeWebhookEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: `sub_stripe_${Date.now()}`,
          customer: `cus_test_${Date.now()}`,
          metadata: { workspaceId },
        },
      },
    });

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    expect(workspace?.subscriptionStatus).toBe(SubscriptionStatus.PAST_DUE);

    // Verify SubscriptionEvent logged
    const subEvent = await prisma.subscriptionEvent.findFirst({
      where: { workspaceId, eventType: 'invoice.payment_failed' },
    });
    expect(subEvent).toBeDefined();
    expect(subEvent?.provider).toBe('STRIPE');
  });

  it('3. should complete bKash MFS sandbox checkout and upgrade plan to GROWTH', async () => {
    const checkout = await createMfsCheckout(workspaceId, 'BKASH', PlanTier.GROWTH);
    expect(checkout.paymentID).toContain('MFS_PAY_BKASH');

    const result = await executeMfsPayment(workspaceId, checkout.paymentID, 'BKASH', PlanTier.GROWTH);
    expect(result.success).toBe(true);
    expect(result.workspace.plan).toBe(PlanTier.GROWTH);
    expect(result.workspace.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);

    // Verify bKash SubscriptionEvent logged
    const mfsEvent = await prisma.subscriptionEvent.findFirst({
      where: { workspaceId, eventType: 'MFS_PAYMENT_SUCCESS' },
    });
    expect(mfsEvent).toBeDefined();
    expect(mfsEvent?.provider).toBe('BKASH');
  });

  it('4. should accurately return workspace usage metering and limits for upgraded plan', async () => {
    const usage = await getWorkspaceUsageAndPlan(workspaceId);

    expect(usage.plan).toBe(PlanTier.GROWTH);
    expect(usage.status).toBe(SubscriptionStatus.ACTIVE);
    expect(usage.limits.priceUsd).toBe(79);
    expect(usage.limits.priceBdt).toBe(8700);
    expect(usage.limits.maxAccounts).toBe(10);
  });
});
